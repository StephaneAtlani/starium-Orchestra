import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  auditLogActionWhere,
  auditLogResourceTypeWhere,
} from './audit-logs-read-legacy';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.query.dto';
import { ListPlatformAuditLogsQueryDto } from './dto/list-platform-audit-logs.query.dto';

export interface CreateAuditLogInput {
  clientId: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/** Événements plateforme sans rattachement à un client métier (RFC-AI-001, archives GLOBAL, etc.). */
export interface CreatePlatformAuditLogInput {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AuditLogItem {
  id: string;
  clientId: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  oldValue: unknown | null;
  newValue: unknown | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: Date;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuditLogInput): Promise<void> {
    try {
      await (this.prisma as any).auditLog.create({
        data: {
          clientId: input.clientId,
          userId: input.userId ?? null,
          action: input.action,
          resourceType: input.resourceType,
          resourceId: input.resourceId ?? null,
          oldValue: input.oldValue ?? null,
          newValue: input.newValue ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          requestId: input.requestId ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log "${input.action}" for client "${input.clientId}": ${
          (error as Error)?.message ?? error
        }`,
      );
    }
  }

  async createPlatform(input: CreatePlatformAuditLogInput): Promise<void> {
    try {
      await this.prisma.platformAuditLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          resourceType: input.resourceType,
          resourceId: input.resourceId ?? null,
          oldValue: input.oldValue ?? undefined,
          newValue: input.newValue ?? undefined,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          requestId: input.requestId ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write platform audit log "${input.action}": ${
          (error as Error)?.message ?? error
        }`,
      );
    }
  }

  async listForClient(params: {
    clientId: string;
    query: ListAuditLogsQueryDto;
  }): Promise<AuditLogItem[]> {
    const { clientId, query } = params;
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const where: any = {
      clientId,
      ...auditLogResourceTypeWhere(query.resourceType),
      ...(query.resourceId && { resourceId: query.resourceId }),
      ...auditLogActionWhere(query.action),
      ...(query.userId && { userId: query.userId }),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom && { gte: query.dateFrom }),
              ...(query.dateTo && { lte: query.dateTo }),
            },
          }
        : {}),
    };

    try {
      const logs = await (this.prisma as any).auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          clientId: true,
          userId: true,
          action: true,
          resourceType: true,
          resourceId: true,
          oldValue: true,
          newValue: true,
          ipAddress: true,
          userAgent: true,
          requestId: true,
          createdAt: true,
        },
      });

      return logs;
    } catch (error) {
      this.logger.error(
        `Failed to list audit logs for client "${clientId}": ${
          (error as Error)?.message ?? error
        }`,
      );
      return [];
    }
  }

  async listForPlatform(
    query: ListPlatformAuditLogsQueryDto,
  ): Promise<AuditLogItem[]> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const where: any = {
      ...(query.clientId && { clientId: query.clientId }),
      ...auditLogResourceTypeWhere(query.resourceType),
      ...(query.resourceId && { resourceId: query.resourceId }),
      ...auditLogActionWhere(query.action),
      ...(query.userId && { userId: query.userId }),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom && { gte: query.dateFrom }),
              ...(query.dateTo && { lte: query.dateTo }),
            },
          }
        : {}),
    };

    try {
      const logs = await (this.prisma as any).auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          clientId: true,
          userId: true,
          action: true,
          resourceType: true,
          resourceId: true,
          oldValue: true,
          newValue: true,
          ipAddress: true,
          userAgent: true,
          requestId: true,
          createdAt: true,
        },
      });

      return logs;
    } catch (error) {
      this.logger.error(
        `Failed to list platform audit logs: ${
          (error as Error)?.message ?? error
        }`,
      );
      return [];
    }
  }
}

