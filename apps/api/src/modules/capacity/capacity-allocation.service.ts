import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActionPlanStatus,
  CapacityAllocationSourceType,
  Prisma,
  ProjectRiskStatus,
  ProjectStatus,
  ResourceType,
  WorkTeamStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CapacityConsumptionService } from './capacity-consumption.service';
import { CapacitySourceAccessService } from './capacity-source-access.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { ListAllocationsQueryDto } from './dto/list-allocations.query.dto';
import { UpdateAllocationDto } from './dto/update-allocation.dto';
import { decimalToString, parsePositiveDays } from './lib/parse-days';
import {
  CapacityCommitmentKind,
  resolveCommitmentKind,
} from './lib/resolve-commitment-kind';
import { splitTotalDaysByWorkingDays } from './lib/split-total-days';

type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

type AllocationRow = {
  id: string;
  clientId: string;
  startDate: Date;
  endDate: Date;
  totalDays: Prisma.Decimal;
  comment: string | null;
  workTeamId: string | null;
  resourceId: string | null;
  sourceType: CapacityAllocationSourceType;
  sourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
  workTeam: { id: string; name: string; status: WorkTeamStatus } | null;
  resource: { id: string; name: string; type: ResourceType } | null;
  months: Array<{ yearMonth: string; days: Prisma.Decimal }>;
};

@Injectable()
export class CapacityAllocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly sourceAccess: CapacitySourceAccessService,
    private readonly consumption: CapacityConsumptionService,
  ) {}

  private toUtcDate(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private assertXorTarget(workTeamId?: string | null, resourceId?: string | null) {
    const hasTeam = workTeamId != null && workTeamId !== '';
    const hasResource = resourceId != null && resourceId !== '';
    if (hasTeam === hasResource) {
      throw new BadRequestException(
        'Cible XOR requise : workTeamId ou resourceId (exactement un)',
      );
    }
  }

  private async validateTarget(
    clientId: string,
    workTeamId: string | null | undefined,
    resourceId: string | null | undefined,
    opts: { requireActiveWorkTeam: boolean },
  ) {
    this.assertXorTarget(workTeamId, resourceId);
    if (workTeamId) {
      const team = await this.prisma.workTeam.findFirst({
        where: { id: workTeamId, clientId },
        select: { id: true, status: true, name: true },
      });
      if (!team) throw new NotFoundException('WorkTeam introuvable');
      if (
        opts.requireActiveWorkTeam &&
        team.status !== WorkTeamStatus.ACTIVE
      ) {
        throw new BadRequestException(
          'Impossible de cibler une WorkTeam archivée',
        );
      }
      return { workTeamId: team.id, resourceId: null as string | null };
    }
    const resource = await this.prisma.resource.findFirst({
      where: { id: resourceId!, clientId },
      select: { id: true, type: true, name: true },
    });
    if (!resource) throw new NotFoundException('Ressource introuvable');
    if (resource.type !== ResourceType.HUMAN) {
      throw new BadRequestException(
        'Allocation individuelle réservée aux ressources HUMAN',
      );
    }
    return { workTeamId: null as string | null, resourceId: resource.id };
  }

  private async validateSource(
    clientId: string,
    sourceType: CapacityAllocationSourceType,
    sourceId: string | null | undefined,
  ): Promise<{ sourceType: CapacityAllocationSourceType; sourceId: string | null }> {
    if (sourceType === CapacityAllocationSourceType.MANUAL) {
      if (sourceId) {
        throw new BadRequestException('sourceId doit être null pour MANUAL');
      }
      return { sourceType, sourceId: null };
    }
    if (!sourceId) {
      throw new BadRequestException('sourceId requis pour une source métier');
    }

    switch (sourceType) {
      case CapacityAllocationSourceType.PROJECT: {
        const p = await this.prisma.project.findFirst({
          where: { id: sourceId, clientId },
          select: { id: true, consumesCapacity: true, parentProjectId: true },
        });
        if (!p) throw new NotFoundException('Source projet introuvable');
        const consumes = await this.consumption.resolveProject(clientId, p.id);
        if (!consumes) {
          throw new BadRequestException(
            'Ce projet n’émet pas de capacité (consumesCapacity)',
          );
        }
        break;
      }
      case CapacityAllocationSourceType.PROJECT_RISK: {
        const r = await this.prisma.projectRisk.findFirst({
          where: { id: sourceId, clientId },
          select: { id: true },
        });
        if (!r) throw new NotFoundException('Source risque introuvable');
        const consumes = await this.consumption.resolveProjectRisk(
          clientId,
          r.id,
        );
        if (!consumes) {
          throw new BadRequestException(
            'Ce risque n’émet pas de capacité (consumesCapacity)',
          );
        }
        break;
      }
      case CapacityAllocationSourceType.ACTION_PLAN: {
        const a = await this.prisma.actionPlan.findFirst({
          where: { id: sourceId, clientId },
          select: { id: true },
        });
        if (!a) throw new NotFoundException('Source plan d’actions introuvable');
        const consumes = await this.consumption.resolveActionPlan(
          clientId,
          a.id,
        );
        if (!consumes) {
          throw new BadRequestException(
            'Ce plan d’actions n’émet pas de capacité (consumesCapacity)',
          );
        }
        break;
      }
      default:
        break;
    }
    return { sourceType, sourceId };
  }

  private async loadSourceStatus(
    clientId: string,
    sourceType: CapacityAllocationSourceType,
    sourceId: string | null,
  ): Promise<ProjectStatus | ProjectRiskStatus | ActionPlanStatus | null> {
    if (sourceType === CapacityAllocationSourceType.MANUAL || !sourceId) {
      return null;
    }
    if (sourceType === CapacityAllocationSourceType.PROJECT) {
      const p = await this.prisma.project.findFirst({
        where: { id: sourceId, clientId },
        select: { status: true },
      });
      return p?.status ?? null;
    }
    if (sourceType === CapacityAllocationSourceType.PROJECT_RISK) {
      const r = await this.prisma.projectRisk.findFirst({
        where: { id: sourceId, clientId },
        select: { status: true },
      });
      return r?.status ?? null;
    }
    const a = await this.prisma.actionPlan.findFirst({
      where: { id: sourceId, clientId },
      select: { status: true },
    });
    return a?.status ?? null;
  }

  private async loadSourceRef(
    clientId: string,
    sourceType: CapacityAllocationSourceType,
    sourceId: string | null,
  ): Promise<{ id: string; label: string } | null> {
    if (!sourceId || sourceType === CapacityAllocationSourceType.MANUAL) {
      return null;
    }
    if (sourceType === CapacityAllocationSourceType.PROJECT) {
      const p = await this.prisma.project.findFirst({
        where: { id: sourceId, clientId },
        select: { id: true, name: true, code: true },
      });
      return p ? { id: p.id, label: `${p.name} (${p.code})` } : null;
    }
    if (sourceType === CapacityAllocationSourceType.PROJECT_RISK) {
      const r = await this.prisma.projectRisk.findFirst({
        where: { id: sourceId, clientId },
        select: { id: true, title: true, code: true },
      });
      return r
        ? { id: r.id, label: r.code ? `${r.title} (${r.code})` : r.title }
        : null;
    }
    const a = await this.prisma.actionPlan.findFirst({
      where: { id: sourceId, clientId },
      select: { id: true, title: true, code: true },
    });
    return a ? { id: a.id, label: `${a.title} (${a.code})` } : null;
  }

  private rebuildMonths(
    allocationId: string,
    clientId: string,
    startDate: Date,
    endDate: Date,
    totalDays: Prisma.Decimal,
  ): Prisma.CapacityAllocationMonthCreateManyInput[] {
    let segments;
    try {
      segments = splitTotalDaysByWorkingDays(startDate, endDate, totalDays);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'SPLIT_ERROR';
      if (msg === 'INVALID_PERIOD') {
        throw new BadRequestException('Période invalide (fin < début)');
      }
      if (msg === 'INVALID_TOTAL_DAYS') {
        throw new BadRequestException('totalDays doit être > 0');
      }
      if (msg === 'NO_WORKING_DAYS') {
        throw new BadRequestException(
          'Aucun jour ouvré sur la période',
        );
      }
      throw e;
    }
    return segments.map((s) => ({
      clientId,
      allocationId,
      yearMonth: s.yearMonth,
      days: s.days,
    }));
  }

  private async toOutput(
    row: AllocationRow,
    opts: { userId: string; maskSource: boolean },
  ) {
    const status = await this.loadSourceStatus(
      row.clientId,
      row.sourceType,
      row.sourceId,
    );
    let commitmentKind: CapacityCommitmentKind = 'FORECAST';
    try {
      commitmentKind = resolveCommitmentKind(row.sourceType, status);
    } catch {
      commitmentKind = 'EXCLUDED';
    }

    let sourceRestricted = false;
    let sourceRef: { id: string; label: string } | null = null;
    let sourceId: string | null = row.sourceId;
    let sourceType = row.sourceType;

    if (row.sourceType !== CapacityAllocationSourceType.MANUAL) {
      const canRead = await this.sourceAccess.canReadSource({
        clientId: row.clientId,
        userId: opts.userId,
        sourceType: row.sourceType,
        sourceId: row.sourceId,
      });
      if (!canRead || opts.maskSource) {
        sourceRestricted = !canRead;
        if (!canRead) {
          sourceRef = null;
          sourceId = null;
        } else {
          sourceRef = await this.loadSourceRef(
            row.clientId,
            row.sourceType,
            row.sourceId,
          );
        }
      } else {
        sourceRef = await this.loadSourceRef(
          row.clientId,
          row.sourceType,
          row.sourceId,
        );
      }
    }

    return {
      id: row.id,
      startDate: row.startDate,
      endDate: row.endDate,
      totalDays: decimalToString(row.totalDays),
      comment: row.comment,
      workTeam: row.workTeam
        ? {
            id: row.workTeam.id,
            name: row.workTeam.name,
            status: row.workTeam.status,
          }
        : null,
      resource: row.resource
        ? { id: row.resource.id, name: row.resource.name }
        : null,
      sourceType,
      sourceId: sourceRestricted ? null : sourceId,
      sourceRef: sourceRestricted ? null : sourceRef,
      sourceRestricted,
      commitmentKind,
      months: row.months.map((m) => ({
        yearMonth: m.yearMonth,
        days: decimalToString(m.days),
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private includeShape = {
    workTeam: { select: { id: true, name: true, status: true } },
    resource: { select: { id: true, name: true, type: true } },
    months: {
      select: { yearMonth: true, days: true },
      orderBy: { yearMonth: 'asc' as const },
    },
  };

  async list(
    clientId: string,
    userId: string,
    query: ListAllocationsQueryDto,
  ) {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    const where: Prisma.CapacityAllocationWhereInput = {
      clientId,
      ...(query.workTeamId ? { workTeamId: query.workTeamId } : {}),
      ...(query.resourceId ? { resourceId: query.resourceId } : {}),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
      ...(query.sourceId ? { sourceId: query.sourceId } : {}),
      ...(query.yearMonthFrom || query.yearMonthTo
        ? {
            months: {
              some: {
                yearMonth: {
                  ...(query.yearMonthFrom
                    ? { gte: query.yearMonthFrom }
                    : {}),
                  ...(query.yearMonthTo ? { lte: query.yearMonthTo } : {}),
                },
              },
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.capacityAllocation.count({ where }),
      this.prisma.capacityAllocation.findMany({
        where,
        include: this.includeShape,
        orderBy: { startDate: 'desc' },
        skip: offset,
        take: limit,
      }),
    ]);

    const items = [];
    for (const row of rows) {
      items.push(await this.toOutput(row as AllocationRow, { userId, maskSource: false }));
    }
    return { items, total, offset, limit };
  }

  async getById(clientId: string, userId: string, id: string) {
    const row = await this.prisma.capacityAllocation.findFirst({
      where: { id, clientId },
      include: this.includeShape,
    });
    if (!row) throw new NotFoundException('Allocation introuvable');
    return this.toOutput(row as AllocationRow, { userId, maskSource: false });
  }

  async listBySource(
    clientId: string,
    userId: string,
    sourceType: CapacityAllocationSourceType,
    sourceId: string,
  ) {
    if (sourceType === CapacityAllocationSourceType.MANUAL) {
      throw new BadRequestException('Source MANUAL non applicable');
    }
    const can = await this.sourceAccess.canReadSource({
      clientId,
      userId,
      sourceType,
      sourceId,
    });
    if (!can) {
      throw new NotFoundException('Source introuvable');
    }
    return this.list(clientId, userId, {
      sourceType,
      sourceId,
      limit: 200,
      offset: 0,
    });
  }

  async create(
    clientId: string,
    userId: string,
    dto: CreateAllocationDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    const sourceType =
      dto.sourceType ?? CapacityAllocationSourceType.MANUAL;
    const source = await this.validateSource(
      clientId,
      sourceType,
      dto.sourceId ?? null,
    );

    if (sourceType !== CapacityAllocationSourceType.MANUAL) {
      const can = await this.sourceAccess.canReadSource({
        clientId,
        userId,
        sourceType,
        sourceId: source.sourceId,
      });
      if (!can) throw new NotFoundException('Source introuvable');
    }

    const target = await this.validateTarget(
      clientId,
      dto.workTeamId,
      dto.resourceId,
      { requireActiveWorkTeam: true },
    );
    const totalDays = parsePositiveDays(dto.totalDays, 'totalDays');
    const startDate = this.toUtcDate(dto.startDate);
    const endDate = this.toUtcDate(dto.endDate);
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('endDate doit être ≥ startDate');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const alloc = await tx.capacityAllocation.create({
        data: {
          clientId,
          startDate,
          endDate,
          totalDays,
          comment: dto.comment ?? null,
          workTeamId: target.workTeamId,
          resourceId: target.resourceId,
          sourceType: source.sourceType,
          sourceId: source.sourceId,
        },
      });
      const months = this.rebuildMonths(
        alloc.id,
        clientId,
        startDate,
        endDate,
        totalDays,
      );
      if (months.length > 0) {
        await tx.capacityAllocationMonth.createMany({ data: months });
      }
      return tx.capacityAllocation.findFirstOrThrow({
        where: { id: alloc.id },
        include: this.includeShape,
      });
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'capacity.allocation.created',
      resourceType: 'capacity_allocation',
      resourceId: created.id,
      newValue: {
        totalDays: decimalToString(totalDays),
        workTeamId: target.workTeamId,
        resourceId: target.resourceId,
        sourceType: source.sourceType,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toOutput(created as AllocationRow, {
      userId,
      maskSource: false,
    });
  }

  async update(
    clientId: string,
    userId: string,
    id: string,
    dto: UpdateAllocationDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.capacityAllocation.findFirst({
      where: { id, clientId },
      include: this.includeShape,
    });
    if (!existing) throw new NotFoundException('Allocation introuvable');

    if (existing.sourceType !== CapacityAllocationSourceType.MANUAL) {
      const canCurrent = await this.sourceAccess.canReadSource({
        clientId,
        userId,
        sourceType: existing.sourceType,
        sourceId: existing.sourceId,
      });
      if (!canCurrent) throw new NotFoundException('Allocation introuvable');
    }

    const nextSourceType = dto.sourceType ?? existing.sourceType;
    const nextSourceId =
      dto.sourceId !== undefined ? dto.sourceId : existing.sourceId;

    if (
      existing.sourceType !== CapacityAllocationSourceType.MANUAL &&
      nextSourceType === CapacityAllocationSourceType.MANUAL
    ) {
      const canCurrent = await this.sourceAccess.canReadSource({
        clientId,
        userId,
        sourceType: existing.sourceType,
        sourceId: existing.sourceId,
      });
      if (!canCurrent) {
        throw new NotFoundException('Allocation introuvable');
      }
    }

    if (
      nextSourceType !== existing.sourceType ||
      nextSourceId !== existing.sourceId
    ) {
      if (nextSourceType !== CapacityAllocationSourceType.MANUAL) {
        const canNew = await this.sourceAccess.canReadSource({
          clientId,
          userId,
          sourceType: nextSourceType,
          sourceId: nextSourceId,
        });
        if (!canNew) throw new NotFoundException('Source introuvable');
      }
    }

    const source = await this.validateSource(
      clientId,
      nextSourceType,
      nextSourceId,
    );

    let workTeamId =
      dto.workTeamId !== undefined ? dto.workTeamId : existing.workTeamId;
    let resourceId =
      dto.resourceId !== undefined ? dto.resourceId : existing.resourceId;

    if (dto.workTeamId !== undefined && dto.workTeamId != null) {
      resourceId = null;
    }
    if (dto.resourceId !== undefined && dto.resourceId != null) {
      workTeamId = null;
    }

    const targetChanged =
      workTeamId !== existing.workTeamId ||
      resourceId !== existing.resourceId;
    const target = await this.validateTarget(clientId, workTeamId, resourceId, {
      requireActiveWorkTeam: targetChanged,
    });

    const totalDays =
      dto.totalDays != null
        ? parsePositiveDays(dto.totalDays, 'totalDays')
        : existing.totalDays;
    const startDate = this.toUtcDate(
      dto.startDate != null ? dto.startDate : existing.startDate,
    );
    const endDate = this.toUtcDate(
      dto.endDate != null ? dto.endDate : existing.endDate,
    );
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('endDate doit être ≥ startDate');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.capacityAllocationMonth.deleteMany({
        where: { allocationId: id, clientId },
      });
      await tx.capacityAllocation.update({
        where: { id },
        data: {
          startDate,
          endDate,
          totalDays,
          comment:
            dto.comment !== undefined ? dto.comment : existing.comment,
          workTeamId: target.workTeamId,
          resourceId: target.resourceId,
          sourceType: source.sourceType,
          sourceId: source.sourceId,
        },
      });
      const months = this.rebuildMonths(
        id,
        clientId,
        startDate,
        endDate,
        totalDays,
      );
      if (months.length > 0) {
        await tx.capacityAllocationMonth.createMany({ data: months });
      }
      return tx.capacityAllocation.findFirstOrThrow({
        where: { id },
        include: this.includeShape,
      });
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'capacity.allocation.updated',
      resourceType: 'capacity_allocation',
      resourceId: id,
      oldValue: {
        totalDays: decimalToString(existing.totalDays),
        workTeamId: existing.workTeamId,
        resourceId: existing.resourceId,
      },
      newValue: {
        totalDays: decimalToString(totalDays),
        workTeamId: target.workTeamId,
        resourceId: target.resourceId,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toOutput(updated as AllocationRow, {
      userId,
      maskSource: false,
    });
  }

  async remove(
    clientId: string,
    userId: string,
    id: string,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.capacityAllocation.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Allocation introuvable');

    if (existing.sourceType !== CapacityAllocationSourceType.MANUAL) {
      const can = await this.sourceAccess.canReadSource({
        clientId,
        userId,
        sourceType: existing.sourceType,
        sourceId: existing.sourceId,
      });
      if (!can) throw new NotFoundException('Allocation introuvable');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.capacityAllocationMonth.deleteMany({
        where: { allocationId: id, clientId },
      });
      await tx.capacityAllocation.delete({ where: { id } });
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'capacity.allocation.deleted',
      resourceType: 'capacity_allocation',
      resourceId: id,
      oldValue: {
        sourceType: existing.sourceType,
        workTeamId: existing.workTeamId,
        resourceId: existing.resourceId,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return { deleted: true, id };
  }
}
