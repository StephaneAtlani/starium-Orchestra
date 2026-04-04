import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ResourceTimeEntry, TimeEntryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  assertResourceHuman,
  resourceHumanDisplayName,
} from '../resources/resource-human.util';
import { CreateResourceTimeEntryDto } from './dto/create-resource-time-entry.dto';
import { ListResourceTimeEntriesQueryDto } from './dto/list-resource-time-entries.query.dto';
import { UpdateResourceTimeEntryDto } from './dto/update-resource-time-entry.dto';

export type ResourceTimeEntryResponse = {
  id: string;
  clientId: string;
  resourceId: string;
  resourceDisplayName: string;
  workDate: string;
  durationHours: number;
  projectId: string | null;
  projectName: string | null;
  projectCode: string | null;
  activityTypeId: string | null;
  activityTypeName: string | null;
  status: TimeEntryStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

function startOfUtcDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function endOfUtcDay(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999Z`);
}

@Injectable()
export class ResourceTimeEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private toResponse(
    row: ResourceTimeEntry & {
      resource: { name: string; firstName: string | null };
      project: { name: string; code: string } | null;
      activityType: { name: string } | null;
    },
  ): ResourceTimeEntryResponse {
    return {
      id: row.id,
      clientId: row.clientId,
      resourceId: row.resourceId,
      resourceDisplayName: resourceHumanDisplayName(row.resource),
      workDate: row.workDate.toISOString(),
      durationHours: Number(row.durationHours),
      projectId: row.projectId,
      projectName: row.project?.name ?? null,
      projectCode: row.project?.code ?? null,
      activityTypeId: row.activityTypeId,
      activityTypeName: row.activityType?.name ?? null,
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private includeDefault() {
    return {
      resource: { select: { name: true, firstName: true } },
      project: { select: { name: true, code: true } },
      activityType: { select: { name: true } },
    } as const;
  }

  async list(clientId: string, query: ListResourceTimeEntriesQueryDto) {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;

    const where: Prisma.ResourceTimeEntryWhereInput = { clientId };

    if (query.resourceId) where.resourceId = query.resourceId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.status) where.status = query.status;

    if (query.from && query.to) {
      if (query.from > query.to) {
        throw new BadRequestException({
          error: 'InvalidDateWindow',
          message: 'from must be <= to',
        });
      }
      where.workDate = {
        gte: startOfUtcDay(query.from),
        lte: endOfUtcDay(query.to),
      };
    } else if (query.from || query.to) {
      throw new BadRequestException({
        error: 'InvalidDateWindow',
        message: 'from and to must be provided together or omitted',
      });
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.resourceTimeEntry.count({ where }),
      this.prisma.resourceTimeEntry.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [{ workDate: 'desc' }, { id: 'desc' }],
        include: this.includeDefault(),
      }),
    ]);

    return {
      items: rows.map((r) => this.toResponse(r)),
      total,
      limit,
      offset,
    };
  }

  async getById(clientId: string, id: string): Promise<ResourceTimeEntryResponse> {
    const row = await this.prisma.resourceTimeEntry.findFirst({
      where: { id, clientId },
      include: this.includeDefault(),
    });
    if (!row) {
      throw new NotFoundException({
        error: 'NotFound',
        message: 'Resource time entry not found',
      });
    }
    return this.toResponse(row);
  }

  private async validateOptionalProject(
    clientId: string,
    projectId: string | null | undefined,
  ): Promise<void> {
    if (!projectId) return;
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: { id: true },
    });
    if (!p) {
      throw new NotFoundException({
        error: 'NotFound',
        message: 'Project not found',
      });
    }
  }

  private async validateOptionalActivityType(
    clientId: string,
    activityTypeId: string | null | undefined,
  ): Promise<void> {
    if (!activityTypeId) return;
    const at = await this.prisma.activityType.findFirst({
      where: { id: activityTypeId, clientId },
      select: { id: true },
    });
    if (!at) {
      throw new NotFoundException({
        error: 'NotFound',
        message: 'Activity type not found',
      });
    }
  }

  async create(
    clientId: string,
    dto: CreateResourceTimeEntryDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<ResourceTimeEntryResponse> {
    await assertResourceHuman(this.prisma, clientId, dto.resourceId);

    await this.validateOptionalProject(clientId, dto.projectId ?? null);
    await this.validateOptionalActivityType(clientId, dto.activityTypeId ?? null);

    const workDate = new Date(dto.workDate);
    if (Number.isNaN(workDate.getTime())) {
      throw new BadRequestException({
        error: 'InvalidDate',
        message: 'workDate is invalid',
      });
    }

    const status = dto.status ?? TimeEntryStatus.DRAFT;

    const created = await this.prisma.resourceTimeEntry.create({
      data: {
        clientId,
        resourceId: dto.resourceId,
        workDate,
        durationHours: new Prisma.Decimal(dto.durationHours),
        projectId: dto.projectId ?? null,
        activityTypeId: dto.activityTypeId ?? null,
        status,
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
      },
      include: this.includeDefault(),
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'resource_time_entry.created',
      resourceType: 'resource_time_entry',
      resourceId: created.id,
      newValue: {
        resourceId: created.resourceId,
        workDate: created.workDate.toISOString(),
        durationHours: dto.durationHours,
        status: created.status,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toResponse(created);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateResourceTimeEntryDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<ResourceTimeEntryResponse> {
    const existing = await this.prisma.resourceTimeEntry.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'NotFound',
        message: 'Resource time entry not found',
      });
    }

    if (dto.projectId !== undefined) {
      await this.validateOptionalProject(clientId, dto.projectId);
    }
    if (dto.activityTypeId !== undefined) {
      await this.validateOptionalActivityType(clientId, dto.activityTypeId);
    }

    let workDateNext = existing.workDate;
    if (dto.workDate !== undefined) {
      workDateNext = new Date(dto.workDate);
      if (Number.isNaN(workDateNext.getTime())) {
        throw new BadRequestException({
          error: 'InvalidDate',
          message: 'workDate is invalid',
        });
      }
    }

    const data: Prisma.ResourceTimeEntryUpdateInput = {};
    if (dto.workDate !== undefined) data.workDate = workDateNext;
    if (dto.durationHours !== undefined) {
      data.durationHours = new Prisma.Decimal(dto.durationHours);
    }
    if (dto.projectId !== undefined) {
      data.project = dto.projectId
        ? { connect: { id: dto.projectId } }
        : { disconnect: true };
    }
    if (dto.activityTypeId !== undefined) {
      data.activityType = dto.activityTypeId
        ? { connect: { id: dto.activityTypeId } }
        : { disconnect: true };
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() ? dto.notes.trim() : null;
    }

    const updated = await this.prisma.resourceTimeEntry.update({
      where: { id: existing.id },
      data,
      include: this.includeDefault(),
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'resource_time_entry.updated',
      resourceType: 'resource_time_entry',
      resourceId: updated.id,
      oldValue: {
        workDate: existing.workDate.toISOString(),
        durationHours: Number(existing.durationHours),
        status: existing.status,
      },
      newValue: {
        workDate: updated.workDate.toISOString(),
        durationHours: Number(updated.durationHours),
        status: updated.status,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toResponse(updated);
  }

  async remove(
    clientId: string,
    id: string,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<void> {
    const existing = await this.prisma.resourceTimeEntry.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'NotFound',
        message: 'Resource time entry not found',
      });
    }

    await this.prisma.resourceTimeEntry.delete({ where: { id: existing.id } });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'resource_time_entry.deleted',
      resourceType: 'resource_time_entry',
      resourceId: id,
      oldValue: {
        workDate: existing.workDate.toISOString(),
        durationHours: Number(existing.durationHours),
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
  }
}
