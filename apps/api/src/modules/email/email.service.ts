import {
  EmailDeliveryStatus,
  NotificationStatus,
  NotificationType,
  Prisma,
  type AlertSeverity,
} from '@prisma/client';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { QueueService } from '../queue/queue.service';
import { renderTemplate, type EmailTemplateKey } from './email.templates';

type QueueEmailInput = {
  clientId: string;
  alertId?: string;
  createdByUserId?: string;
  recipient: string;
  templateKey: EmailTemplateKey;
  title: string;
  message: string;
  actionUrl?: string | null;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly auditLogs: AuditLogsService,
  ) {
    this.assertSmtpEnvForRuntime();
  }

  isLogOnlyMode(): boolean {
    return !process.env.SMTP_HOST?.trim();
  }

  async queueEmail(input: QueueEmailInput): Promise<void> {
    const rendered = renderTemplate(input.templateKey, {
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
    });

    let delivery: { id: string };
    try {
      delivery = await this.prisma.emailDelivery.create({
        data: {
          clientId: input.clientId,
          alertId: input.alertId ?? null,
          createdByUserId: input.createdByUserId ?? null,
          recipient: input.recipient,
          templateKey: input.templateKey,
          subject: rendered.subject,
          actionUrl: input.actionUrl ?? null,
          emailBodyTitle: input.title,
          emailBodyMessage: input.message,
          status: EmailDeliveryStatus.PENDING,
        },
        select: { id: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2022') {
        this.logger.error(e);
        throw new ServiceUnavailableException(
          'Base de données non à jour : appliquer les migrations Prisma (table EmailDelivery, colonnes template / actionUrl).',
        );
      }
      throw e;
    }

    if (this.shouldProcessEmailDeliveriesInline()) {
      await this.processEmailDelivery(delivery.id);
      return;
    }

    try {
      await this.queueService.enqueueSendEmail({
        emailDeliveryId: delivery.id,
      });
    } catch (error) {
      if ((process.env.NODE_ENV ?? 'development') === 'production') {
        this.logger.error(
          `enqueueSendEmail failed, emailDeliveryId=${delivery.id}`,
          error,
        );
        throw error;
      }
      const errMsg = error instanceof Error ? error.message : String(error ?? '');
      this.logger.warn(
        `enqueueSendEmail failed (${errMsg}) — traitement inline (hors production).`,
      );
      await this.processEmailDelivery(delivery.id);
    }
  }

  /**
   * Hors production : envoi immédiat (pas de worker BullMQ requis pour les e-mails en file).
   * Production : file + worker ; surcharger avec EMAIL_DELIVERIES_INLINE=true uniquement si besoin.
   */
  private shouldProcessEmailDeliveriesInline(): boolean {
    const raw = process.env.EMAIL_DELIVERIES_INLINE?.trim().toLowerCase();
    if (raw === 'true' || raw === '1' || raw === 'yes') return true;
    if (raw === 'false' || raw === '0' || raw === 'no') return false;
    return (process.env.NODE_ENV ?? 'development') !== 'production';
  }

  async processEmailDelivery(emailDeliveryId: string): Promise<void> {
    const delivery = await this.prisma.emailDelivery.findUnique({
      where: { id: emailDeliveryId },
      include: {
        alert: {
          select: {
            id: true,
            title: true,
            message: true,
            actionUrl: true,
            clientId: true,
          },
        },
      },
    });
    if (!delivery) return;

    const title =
      delivery.emailBodyTitle?.trim() ||
      delivery.alert?.title ||
      'Notification Starium';
    const message =
      delivery.emailBodyMessage?.trim() ||
      delivery.alert?.message ||
      delivery.subject;
    const actionUrl = delivery.actionUrl ?? delivery.alert?.actionUrl ?? null;
    const rendered = renderTemplate(delivery.templateKey as EmailTemplateKey, {
      title,
      message,
      actionUrl,
    });

    try {
      await this.prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: EmailDeliveryStatus.RETRYING,
          attempts: { increment: 1 },
        },
      });

      if (this.isLogOnlyMode()) {
        this.logger.warn(
          `[EMAIL log-only] to=${delivery.recipient} subject="${rendered.subject}"`,
        );
      } else {
        const transporter = await this.getTransporter();
        await transporter.sendMail({
          from: process.env.SMTP_FROM!,
          to: delivery.recipient,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });
      }

      await this.prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: EmailDeliveryStatus.SENT,
          sentAt: new Date(),
          lastError: null,
        },
      });

      await this.auditLogs.create({
        clientId: delivery.clientId,
        userId: delivery.createdByUserId ?? undefined,
        action: 'email.sent',
        resourceType: 'email_delivery',
        resourceId: delivery.id,
        newValue: { status: EmailDeliveryStatus.SENT },
      });
    } catch (error) {
      const sanitized = this.sanitizeError(error);
      await this.prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: EmailDeliveryStatus.FAILED,
          lastError: sanitized,
        },
      });
      await this.auditLogs.create({
        clientId: delivery.clientId,
        userId: delivery.createdByUserId ?? undefined,
        action: 'email.failed',
        resourceType: 'email_delivery',
        resourceId: delivery.id,
        newValue: { status: EmailDeliveryStatus.FAILED },
      });
      throw error;
    }
  }

  async notifyCriticalAlertRecipients(params: {
    clientId: string;
    alertId: string;
    actorUserId?: string;
    title: string;
    message: string;
    actionUrl?: string | null;
    severity: AlertSeverity;
  }): Promise<void> {
    const recipients = await this.prisma.clientUser.findMany({
      where: {
        clientId: params.clientId,
        status: 'ACTIVE',
        NOT: { role: 'CLIENT_USER' },
      },
      select: {
        userId: true,
        user: { select: { email: true } },
      },
    });

    for (const recipient of recipients) {
      await this.prisma.notification.create({
        data: {
          clientId: params.clientId,
          userId: recipient.userId,
          alertId: params.alertId,
          type: NotificationType.ALERT,
          title: params.title,
          message: params.message,
          status: NotificationStatus.UNREAD,
          actionUrl: params.actionUrl ?? null,
          alertSeverity: params.severity,
        },
      });

      if (params.severity === 'CRITICAL') {
        await this.queueEmail({
          clientId: params.clientId,
          alertId: params.alertId,
          createdByUserId: params.actorUserId,
          recipient: recipient.user.email,
          templateKey: 'critical_alert',
          title: params.title,
          message: params.message,
          actionUrl: params.actionUrl,
        });
      }
    }
  }

  private assertSmtpEnvForRuntime(): void {
    if ((process.env.NODE_ENV ?? 'development') !== 'production') return;

    const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM'] as const;
    const missing = required.filter((key) => !process.env[key]?.trim());
    if (missing.length > 0) {
      throw new Error(
        `SMTP configuration missing in production: ${missing.join(', ')}`,
      );
    }
  }

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter;

    const nodemailer = await import('nodemailer');
    const user = process.env.SMTP_USER?.trim() ?? '';
    const pass = (
      process.env.SMTP_PASSWORD ??
      process.env.SMTP_PASS ??
      ''
    ).trim();
    // MailHog / dev sans auth : ne pas passer auth vide — nodemailer 8 tente sinon PLAIN et lève « Missing credentials ».
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? '587'),
      secure: process.env.SMTP_SECURE === 'true',
      ...(user || pass ? { auth: { user, pass } } : {}),
      connectionTimeout: Number(process.env.SMTP_TIMEOUT_MS ?? '10000'),
    });
    return this.transporter;
  }

  private sanitizeError(error: unknown): string {
    const raw = (error as Error)?.message ?? String(error ?? 'unknown_error');
    const withoutSecrets = raw.replace(
      /(password|passwd|token|secret)=([^,\s]+)/gi,
      '$1=[REDACTED]',
    );
    return withoutSecrets.slice(0, 500);
  }
}
