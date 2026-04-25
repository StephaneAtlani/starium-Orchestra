import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';

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
}
