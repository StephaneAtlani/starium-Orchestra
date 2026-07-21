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
  BadRequestException,
} from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { QueueService } from '../queue/queue.service';
import { renderTemplate, type EmailTemplateKey } from './email.templates';
import {
  buildSmtpTransportOptions,
  formatSmtpSendResultLogLine,
  resolveSmtpPasswordEnv,
} from './smtp-transport.util';
import { STARIUM_REPORT_COLORS } from '../projects/project-reviews/project-review-report-branding.helpers';

type QueueEmailInput = {
  clientId: string;
  alertId?: string;
  projectReviewId?: string;
  createdByUserId?: string;
  recipient: string;
  templateKey: EmailTemplateKey;
  title: string;
  message: string;
  actionUrl?: string | null;
  meetingJoinUrl?: string | null;
  htmlBody?: string | null;
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
    if (input.templateKey === 'project_review_report') {
      await this.sendProjectReviewReportEmail(input);
      return;
    }

    await this.queueGenericEmail(input);
  }

  /** Compte rendu point projet — HTML riche obligatoire, persistance SQL, inline en dev. */
  async sendProjectReviewReportEmail(input: QueueEmailInput): Promise<void> {
    if (!input.htmlBody?.trim()) {
      throw new BadRequestException(
        'Compte rendu point projet : le corps HTML est obligatoire',
      );
    }

    const rendered = renderTemplate('project_review_report', {
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      htmlBody: input.htmlBody,
    });
    const outboundHtml = this.buildProjectReviewReportMimeHtml(
      input.htmlBody,
      input.actionUrl,
    );
    const outboundText = rendered.text;

    let delivery: { id: string };
    try {
      delivery = await this.prisma.emailDelivery.create({
        data: {
          clientId: input.clientId,
          alertId: input.alertId ?? null,
          projectReviewId: input.projectReviewId ?? null,
          createdByUserId: input.createdByUserId ?? null,
          recipient: input.recipient,
          templateKey: 'project_review_report',
          subject: rendered.subject,
          actionUrl: input.actionUrl ?? null,
          emailBodyTitle: input.title,
          emailBodyMessage: outboundText,
          emailBodyHtml: outboundHtml,
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

    this.logger.log(
      `[EMAIL report] livraison id=${delivery.id} → ${input.recipient} htmlLen=${outboundHtml.length}`,
    );

    await this.persistRenderedEmailBodies(delivery.id, outboundHtml, outboundText);
    await this.assertProjectReviewHtmlPersisted(
      delivery.id,
      'project_review_report',
      outboundHtml,
    );

    if (this.shouldDeliverProjectReviewReportInline()) {
      this.logger.log(
        `[EMAIL report] envoi inline emailDeliveryId=${delivery.id}`,
      );
      await this.processEmailDelivery(delivery.id, { mimeHtml: outboundHtml });
      return;
    }

    this.logger.log(
      `[EMAIL report] enqueue BullMQ emailDeliveryId=${delivery.id} mimeHtmlLen=${outboundHtml.length}`,
    );
    await this.queueService.enqueueSendEmail({
      emailDeliveryId: delivery.id,
      mimeHtml: outboundHtml,
    });
  }

  private async queueGenericEmail(input: QueueEmailInput): Promise<void> {
    const rendered = renderTemplate(input.templateKey, {
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      meetingJoinUrl: input.meetingJoinUrl,
      htmlBody: input.htmlBody,
    });

    let delivery: { id: string };
    try {
      delivery = await this.prisma.emailDelivery.create({
        data: {
          clientId: input.clientId,
          alertId: input.alertId ?? null,
          projectReviewId: input.projectReviewId ?? null,
          createdByUserId: input.createdByUserId ?? null,
          recipient: input.recipient,
          templateKey: input.templateKey,
          subject: rendered.subject,
          actionUrl: input.actionUrl ?? null,
          emailBodyTitle: input.title,
          emailBodyMessage: rendered.text,
          emailBodyHtml: rendered.html,
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

    this.logger.log(
      `[EMAIL] livraison créée id=${delivery.id} → ${input.recipient} template=${input.templateKey}`,
    );

    if (this.shouldProcessEmailDeliveriesInline()) {
      this.logger.log(
        `[EMAIL] mode=inline (pas de worker) emailDeliveryId=${delivery.id}`,
      );
      await this.processEmailDelivery(delivery.id, { mimeHtml: rendered.html });
      return;
    }

    try {
      this.logger.log(
        `[EMAIL] mode=file emailDeliveryId=${delivery.id} — enqueue BullMQ`,
      );
      await this.queueService.enqueueSendEmail({
        emailDeliveryId: delivery.id,
        mimeHtml: rendered.html,
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
      await this.processEmailDelivery(delivery.id, { mimeHtml: rendered.html });
    }
  }

  /**
   * Compte rendu : envoi inline hors production (évite un worker BullMQ obsolète en dev Docker).
   */
  private shouldDeliverProjectReviewReportInline(): boolean {
    if ((process.env.NODE_ENV ?? 'development') === 'production') {
      return this.shouldProcessEmailDeliveriesInline();
    }
    return true;
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

  async processEmailDelivery(
    emailDeliveryId: string,
    options?: { mimeHtml?: string | null },
  ): Promise<void> {
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
    if (!delivery) {
      this.logger.warn(
        `[EMAIL send] emailDeliveryId=${emailDeliveryId} introuvable en base (job orphelin ?)`,
      );
      return;
    }

    if (delivery.status === EmailDeliveryStatus.SENT) {
      this.logger.log(
        `[EMAIL send] ignoré (déjà envoyé) emailDeliveryId=${emailDeliveryId}`,
      );
      return;
    }

    const staleRetryingMs = Number(
      process.env.EMAIL_STALE_RETRYING_MS ?? '120000',
    );
    const staleRetryingBefore = new Date(Date.now() - staleRetryingMs);
    const claimed = await this.prisma.emailDelivery.updateMany({
      where: {
        id: emailDeliveryId,
        OR: [
          {
            status: {
              in: [EmailDeliveryStatus.PENDING, EmailDeliveryStatus.FAILED],
            },
          },
          {
            status: EmailDeliveryStatus.RETRYING,
            updatedAt: { lt: staleRetryingBefore },
          },
        ],
      },
      data: {
        status: EmailDeliveryStatus.RETRYING,
        attempts: { increment: 1 },
      },
    });

    if (claimed.count === 0) {
      const current = await this.prisma.emailDelivery.findUnique({
        where: { id: emailDeliveryId },
        select: { status: true },
      });
      if (current?.status === EmailDeliveryStatus.SENT) {
        return;
      }
      this.logger.warn(
        `[EMAIL send] ignoré (déjà en cours) emailDeliveryId=${emailDeliveryId} status=${current?.status ?? 'unknown'}`,
      );
      return;
    }

    this.logger.log(
      `[EMAIL send] début emailDeliveryId=${delivery.id} to=${delivery.recipient} template=${delivery.templateKey} smtp=${this.isLogOnlyMode() ? 'log-only' : 'relay'}`,
    );

    const title =
      delivery.emailBodyTitle?.trim() ||
      delivery.alert?.title ||
      'Notification Starium';
    const message =
      delivery.emailBodyMessage?.trim() ||
      delivery.alert?.message ||
      delivery.subject;
    const actionUrl = delivery.actionUrl ?? delivery.alert?.actionUrl ?? null;
    let storedHtml =
      options?.mimeHtml?.trim() ||
      delivery.emailBodyHtml?.trim() ||
      null;
    if (!storedHtml) {
      storedHtml = await this.loadPersistedEmailHtml(emailDeliveryId);
    }
    if (
      delivery.templateKey === 'project_review_report' &&
      !storedHtml
    ) {
      throw new ServiceUnavailableException(
        `Compte rendu HTML introuvable pour emailDeliveryId=${delivery.id}. ` +
          `Redémarrez api-dev et api-worker-dev après « prisma generate ».`,
      );
    }
    const rendered = renderTemplate(delivery.templateKey as EmailTemplateKey, {
      title,
      message,
      actionUrl,
      htmlBody: storedHtml,
    });
    const subject = delivery.subject?.trim() || rendered.subject;
    const text = delivery.emailBodyMessage?.trim() || rendered.text;
    const html =
      delivery.templateKey === 'project_review_report'
        ? storedHtml!
        : (storedHtml ?? rendered.html);

    try {
      if (this.isLogOnlyMode()) {
        this.logger.warn(
          `[EMAIL log-only] to=${delivery.recipient} subject="${subject}"`,
        );
      } else {
        const transporter = await this.getTransporter();
        const sent = await transporter.sendMail({
          from: process.env.SMTP_FROM!,
          to: delivery.recipient,
          subject,
          text,
          html,
        });
        this.logger.log(
          formatSmtpSendResultLogLine(
            `emailDeliveryId=${delivery.id} to=${delivery.recipient}`,
            sent,
          ),
        );
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
      this.logger.error(
        `[EMAIL send] échec emailDeliveryId=${delivery.id} to=${delivery.recipient}: ${sanitized}`,
        error instanceof Error ? error.stack : undefined,
      );
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
      const existingNotif = await this.prisma.notification.findFirst({
        where: {
          clientId: params.clientId,
          userId: recipient.userId,
          alertId: params.alertId,
        },
        select: { id: true },
      });

      if (!existingNotif) {
        try {
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
        } catch (error) {
          if (
            !(
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'
            )
          ) {
            throw error;
          }
        }
      }

      if (params.severity !== 'CRITICAL') continue;

      const existingEmail = await this.prisma.emailDelivery.findFirst({
        where: {
          alertId: params.alertId,
          recipient: recipient.user.email,
          templateKey: 'critical_alert',
          status: {
            in: [
              EmailDeliveryStatus.PENDING,
              EmailDeliveryStatus.SENT,
              EmailDeliveryStatus.RETRYING,
            ],
          },
        },
        select: { id: true },
      });
      if (existingEmail) continue;

      try {
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
      } catch (error) {
        if (
          !(
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          )
        ) {
          throw error;
        }
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

    const host = process.env.SMTP_HOST!.trim().toLowerCase();
    const user = process.env.SMTP_USER?.trim() ?? '';
    const pass = resolveSmtpPasswordEnv();
    const authMandatory =
      host.includes('brevo.com') ||
      host.includes('sendinblue.com') ||
      host.includes('smtp.gmail.com') ||
      host.includes('smtp.office365.com');
    if (authMandatory && (!user || !pass)) {
      throw new Error(
        `SMTP : ce fournisseur exige SMTP_USER + SMTP_PASS non vide. ` +
          `user=${user ? 'défini' : 'absent'}, motDePasseEffectif=${pass ? 'défini' : 'absent'}. ` +
          `Brevo : clé SMTP xsmtpsib-… — https://developers.brevo.com/docs/smtp-integration`,
      );
    }
  }

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter;

    const nodemailer = await import('nodemailer');
    // MailHog / dev sans auth : options sans auth — voir smtp-transport.util.ts (Brevo : requireTLS sur 587).
    this.transporter = nodemailer.createTransport(buildSmtpTransportOptions());
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

  private buildProjectReviewReportMimeHtml(
    htmlBody: string,
    actionUrl?: string | null,
  ): string {
    const body = htmlBody.trim();
    const action = actionUrl?.trim()
      ? `<p style="margin:20px 0 0;text-align:center;"><a href="${this.escapeHtmlAttribute(actionUrl.trim())}" style="display:inline-block;padding:10px 18px;background:${STARIUM_REPORT_COLORS.gold};color:${STARIUM_REPORT_COLORS.ink};text-decoration:none;border-radius:8px;font-weight:700;border:1px solid ${STARIUM_REPORT_COLORS.gold600};">Ouvrir dans Starium</a></p>`
      : '';
    return `${body}${action}`;
  }

  private escapeHtmlAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  /**
   * Garantit la persistance du HTML rendu même si le client Prisma en mémoire
   * n’a pas été regénéré après migration (sinon emailBodyHtml reste NULL en base).
   */
  private async persistRenderedEmailBodies(
    deliveryId: string,
    html: string,
    text: string,
  ): Promise<void> {
    const htmlTrimmed = html.trim();
    const textTrimmed = text.trim();
    if (!htmlTrimmed && !textTrimmed) return;

    await this.prisma.$executeRaw`
      UPDATE "EmailDelivery"
      SET
        "emailBodyHtml" = ${htmlTrimmed || null},
        "emailBodyMessage" = ${textTrimmed || null}
      WHERE id = ${deliveryId}
    `;
  }

  private async loadPersistedEmailHtml(
    deliveryId: string,
  ): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<Array<{ emailBodyHtml: string | null }>>`
      SELECT "emailBodyHtml" FROM "EmailDelivery" WHERE id = ${deliveryId} LIMIT 1
    `;
    return rows[0]?.emailBodyHtml?.trim() || null;
  }

  private async assertProjectReviewHtmlPersisted(
    deliveryId: string,
    templateKey: EmailTemplateKey,
    sourceHtml?: string | null,
  ): Promise<void> {
    if (templateKey !== 'project_review_report') return;

    const rows = await this.prisma.$queryRaw<Array<{ htmlLen: bigint }>>`
      SELECT length(COALESCE("emailBodyHtml", '')) AS "htmlLen"
      FROM "EmailDelivery"
      WHERE id = ${deliveryId}
      LIMIT 1
    `;
    const htmlLen = Number(rows[0]?.htmlLen ?? 0);
    const sourceLen = sourceHtml?.trim().length ?? 0;

    this.logger.log(
      `[EMAIL] html persisté emailDeliveryId=${deliveryId} htmlLen=${htmlLen} sourceLen=${sourceLen}`,
    );

    if (htmlLen >= 100) return;

    throw new ServiceUnavailableException(
      `Compte rendu HTML non enregistré en base (htmlLen=${htmlLen}). ` +
        `Recréez les conteneurs : docker compose -f docker-compose.dev.yml up -d --force-recreate api-dev api-worker-dev`,
    );
  }
}
