import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityTaxonomyKind,
  ActivityType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ensureDefaultActivityTypes } from './activity-types-defaults';
import { CreateActivityTypeDto } from './dto/create-activity-type.dto';
import { ListActivityTypesQueryDto } from './dto/list-activity-types.query.dto';
import { UpdateActivityTypeDto } from './dto/update-activity-type.dto';

export type ActivityTypeResponse = {
  id: string;
  clientId: string;
  kind: ActivityTaxonomyKind;
  name: string;
  code: string | null;
  description: string | null;
  sortOrder: number;
  isDefaultForKind: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

@Injectable()
export class ActivityTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  normalizeCode(raw: string | undefined | null): string | null {
    if (raw === undefined || raw === null) {
      return null;
    }
    const t = raw.trim();
    if (t.length === 0) {
      return null;
    }
    return t.toUpperCase();
  }

  private toOutput(row: ActivityType): ActivityTypeResponse {
    return {
      id: row.id,
      clientId: row.clientId,
      kind: row.kind,
      name: row.name,
      code: row.code,
      description: row.description,
      sortOrder: row.sortOrder,
      isDefaultForKind: row.isDefaultForKind,
      archivedAt: row.archivedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async ensureDefaultsForClient(clientId: string): Promise<void> {
    await ensureDefaultActivityTypes(this.prisma, clientId);
  }

  async list(clientId: string, query: ListActivityTypesQueryDto) {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;

    const where: Prisma.ActivityTypeWhereInput = {
      clientId,
      ...(query.defaultsOnly ? { isDefaultForKind: true } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.includeArchived
        ? {}
        : {
            archivedAt: null,
          }),
      ...(query.search?.trim()
        ? {
            OR: [
              {
                name: {
                  contains: query.search.trim(),
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                code: {
                  contains: query.search.trim().toUpperCase(),
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.activityType.count({ where }),
      this.prisma.activityType.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ]);

    return {
      items: rows.map((r) => this.toOutput(r)),
      total,
      limit,
      offset,
    };
  }

  async getById(clientId: string, id: string): Promise<ActivityTypeResponse> {
    const row = await this.prisma.activityType.findFirst({
      where: { id, clientId },
    });
    if (!row) {
      throw new NotFoundException('Type d’activité introuvable');
    }
    return this.toOutput(row);
  }

  async create(
    clientId: string,
    dto: CreateActivityTypeDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<ActivityTypeResponse> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Nom requis');
    }
    const code = this.normalizeCode(dto.code);
    if (code) {
      const dup = await this.prisma.activityType.findFirst({
        where: { clientId, code },
        select: { id: true },
      });
      if (dup) {
        throw new ConflictException('Code déjà utilisé pour ce client');
      }
    }

    const isDefault = dto.isDefaultForKind === true;

    const created = await this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.activityType.updateMany({
          where: { clientId, kind: dto.kind },
          data: { isDefaultForKind: false },
        });
      }
      return tx.activityType.create({
        data: {
          clientId,
          kind: dto.kind,
          name,
          code,
          description:
            dto.description !== undefined
              ? dto.description?.trim() || null
              : null,
          sortOrder: dto.sortOrder ?? 0,
          isDefaultForKind: isDefault,
        },
      });
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'activity_type.created',
      resourceType: 'activity_type',
      resourceId: created.id,
      newValue: {
        kind: created.kind,
        name: created.name,
        code: created.code,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toOutput(created);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateActivityTypeDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<ActivityTypeResponse> {
    const existing = await this.prisma.activityType.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Type d’activité introuvable');
    }

    const code =
      dto.code !== undefined ? this.normalizeCode(dto.code) : undefined;
    if (code !== undefined && code !== null) {
      const dup = await this.prisma.activityType.findFirst({
        where: {
          clientId,
          code,
          NOT: { id: existing.id },
        },
        select: { id: true },
      });
      if (dup) {
        throw new ConflictException('Code déjà utilisé pour ce client');
      }
    }

    const name =
      dto.name !== undefined ? dto.name.trim() : undefined;
    if (name !== undefined && name.length === 0) {
      throw new BadRequestException('Nom requis');
    }

    const kindNext =
      dto.kind !== undefined ? dto.kind : existing.kind;
    const isDefaultNext =
      dto.isDefaultForKind !== undefined
        ? dto.isDefaultForKind
        : existing.isDefaultForKind;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefaultForKind === true) {
        await tx.activityType.updateMany({
          where: {
            clientId,
            kind: kindNext,
            NOT: { id: existing.id },
          },
          data: { isDefaultForKind: false },
        });
      }

      const data: Prisma.ActivityTypeUpdateInput = {};
      if (dto.kind !== undefined) data.kind = dto.kind;
      if (name !== undefined) data.name = name;
      if (code !== undefined) data.code = code;
      if (dto.description !== undefined) {
        data.description = dto.description?.trim() || null;
      }
      if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
      if (dto.isDefaultForKind !== undefined) {
        data.isDefaultForKind = dto.isDefaultForKind;
      }

      return tx.activityType.update({
        where: { id: existing.id },
        data,
      });
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'activity_type.updated',
      resourceType: 'activity_type',
      resourceId: updated.id,
      oldValue: {
        kind: existing.kind,
        name: existing.name,
        code: existing.code,
      },
      newValue: {
        kind: updated.kind,
        name: updated.name,
        code: updated.code,
        isDefaultForKind: isDefaultNext,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toOutput(updated);
  }

  async archive(
    clientId: string,
    id: string,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<ActivityTypeResponse> {
    const existing = await this.prisma.activityType.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Type d’activité introuvable');
    }
    if (existing.archivedAt !== null) {
      return this.toOutput(existing);
    }

    const updated = await this.prisma.activityType.update({
      where: { id: existing.id },
      data: { archivedAt: new Date() },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'activity_type.archived',
      resourceType: 'activity_type',
      resourceId: updated.id,
      oldValue: { archivedAt: null },
      newValue: { archivedAt: updated.archivedAt },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toOutput(updated);
  }

  async restore(
    clientId: string,
    id: string,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<ActivityTypeResponse> {
    const existing = await this.prisma.activityType.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Type d’activité introuvable');
    }
    if (existing.archivedAt === null) {
      return this.toOutput(existing);
    }

    const updated = await this.prisma.activityType.update({
      where: { id: existing.id },
      data: { archivedAt: null },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'activity_type.restored',
      resourceType: 'activity_type',
      resourceId: updated.id,
      oldValue: { archivedAt: existing.archivedAt },
      newValue: { archivedAt: null },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toOutput(updated);
  }
}
