import { Injectable } from '@nestjs/common';
import {
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';

export type CreateNotificationForUserInput = {
  clientId: string;
  userId: string;
  actorUserId?: string;
  type?: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  entityLabel?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
};

function sanitizeNotificationMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (metadata == null) return undefined;
  const { meetingUrl: _omit, ...rest } = metadata;
  void _omit;
  return rest as Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(clientId: string, userId: string, query: GetNotificationsQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where = {
      clientId,
      userId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          clientId,
          userId,
          status: 'UNREAD',
        },
      }),
    ]);
    return { items, total, unread, limit, offset };
  }

  async markRead(clientId: string, userId: string, notificationId: string) {
    const updated = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        clientId,
        userId,
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });
    if (updated.count > 0) {
      await this.auditLogs.create({
        clientId,
        userId,
        action: 'notification.read',
        resourceType: 'notification',
        resourceId: notificationId,
      });
    }
    return { updated: updated.count };
  }

  async markAllRead(clientId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        clientId,
        userId,
        status: 'UNREAD',
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });
    await this.auditLogs.create({
      clientId,
      userId,
      action: 'notification.read',
      resourceType: 'notification',
      newValue: { mode: 'read_all', updated: result.count },
    });
    return { updated: result.count };
  }

  async createForUser(input: CreateNotificationForUserInput) {
    const type = input.type ?? NotificationType.INFO;
    const metadata = sanitizeNotificationMetadata(input.metadata ?? undefined);

    const notification = await this.prisma.notification.create({
      data: {
        clientId: input.clientId,
        userId: input.userId,
        type,
        title: input.title,
        message: input.message,
        status: NotificationStatus.UNREAD,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        actionUrl: input.actionUrl ?? null,
        ...(metadata !== undefined ? { metadata } : {}),
      },
    });

    await this.auditLogs.create({
      clientId: input.clientId,
      userId: input.actorUserId,
      action: 'notification.created',
      resourceType: 'notification',
      resourceId: notification.id,
    });

    return notification;
  }
}
