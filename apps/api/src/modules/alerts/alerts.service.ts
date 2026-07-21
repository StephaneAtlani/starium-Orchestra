import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  EmailDeliveryStatus,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailService } from '../email/email.service';
import { GetAlertsQueryDto } from './dto/get-alerts-query.dto';

type RequestMeta = { ipAddress?: string; userAgent?: string; requestId?: string };

export type UpsertAlertInput = {
  clientId: string;
  actorUserId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  actionUrl?: string;
  ruleCode: string;
  metadata?: unknown;
  meta?: RequestMeta;
};

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly emailService: EmailService,
  ) {}

  async list(clientId: string, query: GetAlertsQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where = {
      clientId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.alert.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  async resolve(
    clientId: string,
    alertId: string,
    actorUserId?: string,
    meta?: RequestMeta,
  ) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, clientId },
    });
    if (!alert) throw new NotFoundException('Alerte introuvable');
    const updated = await this.prisma.alert.update({
      where: { id: alert.id },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedById: actorUserId ?? null,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'alert.resolved',
      resourceType: 'alert',
      resourceId: updated.id,
      oldValue: { status: alert.status },
      newValue: { status: updated.status },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return updated;
  }

  async dismiss(
    clientId: string,
    alertId: string,
    actorUserId?: string,
    meta?: RequestMeta,
  ) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, clientId },
    });
    if (!alert) throw new NotFoundException('Alerte introuvable');
    const updated = await this.prisma.alert.update({
      where: { id: alert.id },
      data: {
        status: AlertStatus.DISMISSED,
        dismissedAt: new Date(),
        dismissedById: actorUserId ?? null,
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'alert.dismissed',
      resourceType: 'alert',
      resourceId: updated.id,
      oldValue: { status: alert.status },
      newValue: { status: updated.status },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return updated;
  }

  /**
   * Auto-résolution : clôture les alertes ACTIVE d'une famille (type + ruleCodes)
   * dont l'entité ne remplit plus la condition (absente de `activeEntityIds`).
   * Empêche l'accumulation d'alertes obsolètes après correction côté métier.
   */
  async resolveStaleByRule(params: {
    clientId: string;
    type: AlertType;
    ruleCodes: string[];
    activeEntityIds: string[];
  }): Promise<number> {
    const { clientId, type, ruleCodes, activeEntityIds } = params;
    if (ruleCodes.length === 0) return 0;

    const stale = await this.prisma.alert.findMany({
      where: {
        clientId,
        type,
        ruleCode: { in: ruleCodes },
        status: AlertStatus.ACTIVE,
        ...(activeEntityIds.length > 0
          ? { entityId: { notIn: activeEntityIds } }
          : {}),
      },
      select: { id: true },
    });
    if (stale.length === 0) return 0;

    await this.prisma.alert.updateMany({
      where: { id: { in: stale.map((a) => a.id) } },
      data: { status: AlertStatus.RESOLVED, resolvedAt: new Date() },
    });
    return stale.length;
  }

  /**
   * Upsert alerte ACTIVE (anti-doublon) puis fan-out canaux idempotent :
   * - Notification : au plus une ligne par (clientId, userId, alertId)
   * - Email CRITICAL : au plus un EmailDelivery actif par (alertId, recipient)
   */
  async upsertAlert(input: UpsertAlertInput) {
    const existing = await this.prisma.alert.findFirst({
      where: {
        clientId: input.clientId,
        type: input.type,
        severity: input.severity,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        ruleCode: input.ruleCode,
        status: AlertStatus.ACTIVE,
      },
    });

    let alert;
    if (existing) {
      alert = await this.prisma.alert.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          message: input.message,
          entityLabel: input.entityLabel ?? null,
          actionUrl: input.actionUrl ?? null,
          metadata: (input.metadata as any) ?? null,
        },
      });
    } else {
      alert = await this.prisma.alert.create({
        data: {
          clientId: input.clientId,
          type: input.type,
          severity: input.severity,
          title: input.title,
          message: input.message,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          entityLabel: input.entityLabel ?? null,
          actionUrl: input.actionUrl ?? null,
          ruleCode: input.ruleCode,
          metadata: (input.metadata as any) ?? null,
          status: AlertStatus.ACTIVE,
        },
      });

      await this.auditLogs.create({
        clientId: input.clientId,
        userId: input.actorUserId,
        action: 'alert.created',
        resourceType: 'alert',
        resourceId: alert.id,
        newValue: { severity: alert.severity, type: alert.type },
        ipAddress: input.meta?.ipAddress,
        userAgent: input.meta?.userAgent,
        requestId: input.meta?.requestId,
      });
    }

    await this.fanOutAlertChannels(alert.id, input);
    return alert;
  }

  /**
   * Diffusion in-app + email CRITICAL, idempotente (N1/N2/E2).
   * Nouvel admin sans notif existante : reçoit une notif à la prochaine éval.
   */
  private async fanOutAlertChannels(
    alertId: string,
    input: UpsertAlertInput,
  ): Promise<void> {
    const recipients = await this.prisma.clientUser.findMany({
      where: {
        clientId: input.clientId,
        status: 'ACTIVE',
        OR: [
          { role: 'CLIENT_ADMIN' },
          {
            user: {
              userRoles: {
                some: {
                  role: {
                    rolePermissions: {
                      some: {
                        permission: { code: 'alerts.read' },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      select: {
        userId: true,
        user: { select: { email: true } },
      },
    });

    for (const recipient of recipients) {
      const existingNotif = await this.prisma.notification.findFirst({
        where: {
          clientId: input.clientId,
          userId: recipient.userId,
          alertId,
        },
        select: { id: true },
      });

      if (!existingNotif) {
        try {
          const created = await this.prisma.notification.create({
            data: {
              clientId: input.clientId,
              userId: recipient.userId,
              alertId,
              type: NotificationType.ALERT,
              title: input.title,
              message: input.message,
              status: NotificationStatus.UNREAD,
              entityType: input.entityType ?? null,
              entityId: input.entityId ?? null,
              entityLabel: input.entityLabel ?? null,
              actionUrl: input.actionUrl ?? null,
              alertSeverity: input.severity,
            },
          });
          await this.auditLogs.create({
            clientId: input.clientId,
            userId: input.actorUserId,
            action: 'notification.created',
            resourceType: 'notification',
            resourceId: created.id,
          });
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
          // Course multi-instances : une notif existe déjà — skip.
        }
      }

      if (input.severity !== AlertSeverity.CRITICAL) continue;

      const existingEmail = await this.prisma.emailDelivery.findFirst({
        where: {
          alertId,
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
        await this.emailService.queueEmail({
          clientId: input.clientId,
          alertId,
          createdByUserId: input.actorUserId,
          recipient: recipient.user.email,
          templateKey: 'critical_alert',
          title: input.title,
          message: input.message,
          actionUrl: input.actionUrl ?? null,
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
