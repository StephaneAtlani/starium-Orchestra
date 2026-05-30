import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { normalizeListPagination } from '../projects/lib/paginated-list.util';
import { CreateGovernanceCycleDto } from './dto/create-governance-cycle.dto';
import { ListGovernanceCyclesQueryDto } from './dto/list-governance-cycles-query.dto';
import { UpdateGovernanceCycleDto } from './dto/update-governance-cycle.dto';
import type {
  GovernanceCycleListResponseDto,
  GovernanceCycleResponseDto,
  GovernanceCycleSummaryDto,
} from './governance-cycles.types';

type GovernanceAuditContext = {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
};

const GOVERNANCE_CYCLE_RESOURCE_TYPE = 'governance_cycle';

type CycleRow = {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  description: string | null;
  cadence: GovernanceCycleResponseDto['cadence'];
  status: GovernanceCycleStatus;
  startDate: Date | null;
  endDate: Date | null;
  sponsorLabel: string | null;
  objectiveSummary: string | null;
  decisionSummary: string | null;
  validatedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class GovernanceCyclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private async audit(
    clientId: string,
    context: GovernanceAuditContext | undefined,
    action: string,
    resourceId: string,
    oldValue?: Prisma.JsonObject,
    newValue?: Prisma.JsonObject,
  ) {
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: GOVERNANCE_CYCLE_RESOURCE_TYPE,
      resourceId,
      oldValue,
      newValue,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  private cycleAuditSnapshot(row: CycleRow): Prisma.JsonObject {
    return {
      name: row.name,
      code: row.code,
      cadence: row.cadence,
      status: row.status,
      startDate: row.startDate?.toISOString() ?? null,
      endDate: row.endDate?.toISOString() ?? null,
      description: row.description,
      sponsorLabel: row.sponsorLabel,
      objectiveSummary: row.objectiveSummary,
      decisionSummary: row.decisionSummary,
    };
  }

  private parseOptionalDate(
    value: string | null | undefined,
  ): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return new Date(value);
  }

  private toResponse(
    row: CycleRow,
    summary: GovernanceCycleSummaryDto,
  ): GovernanceCycleResponseDto {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      cadence: row.cadence,
      status: row.status,
      startDate: row.startDate?.toISOString() ?? null,
      endDate: row.endDate?.toISOString() ?? null,
      description: row.description,
      sponsorLabel: row.sponsorLabel,
      objectiveSummary: row.objectiveSummary,
      decisionSummary: row.decisionSummary,
      validatedAt: row.validatedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      summary,
    };
  }

  private async buildSummariesForCycles(
    clientId: string,
    cycleIds: string[],
  ): Promise<Map<string, GovernanceCycleSummaryDto>> {
    const map = new Map<string, GovernanceCycleSummaryDto>();
    if (cycleIds.length === 0) return map;

    const [totalGroups, acceptedGroups, deferredGroups] = await Promise.all([
      this.prisma.governanceCycleItem.groupBy({
        by: ['cycleId'],
        where: { clientId, cycleId: { in: cycleIds } },
        _count: { _all: true },
      }),
      this.prisma.governanceCycleItem.groupBy({
        by: ['cycleId'],
        where: {
          clientId,
          cycleId: { in: cycleIds },
          decisionStatus: GovernanceCycleItemDecisionStatus.ACCEPTED,
        },
        _count: { _all: true },
      }),
      this.prisma.governanceCycleItem.groupBy({
        by: ['cycleId'],
        where: {
          clientId,
          cycleId: { in: cycleIds },
          decisionStatus: GovernanceCycleItemDecisionStatus.DEFERRED,
        },
        _count: { _all: true },
      }),
    ]);

    const acceptedByCycle = new Map(
      acceptedGroups.map((g) => [g.cycleId, g._count._all]),
    );
    const deferredByCycle = new Map(
      deferredGroups.map((g) => [g.cycleId, g._count._all]),
    );

    for (const cycleId of cycleIds) {
      const totalRow = totalGroups.find((g) => g.cycleId === cycleId);
      map.set(cycleId, {
        itemsCount: totalRow?._count._all ?? 0,
        acceptedItemsCount: acceptedByCycle.get(cycleId) ?? 0,
        deferredItemsCount: deferredByCycle.get(cycleId) ?? 0,
      });
    }

    return map;
  }

  private async getSummaryForCycle(
    clientId: string,
    cycleId: string,
  ): Promise<GovernanceCycleSummaryDto> {
    const summaries = await this.buildSummariesForCycles(clientId, [cycleId]);
    return (
      summaries.get(cycleId) ?? {
        itemsCount: 0,
        acceptedItemsCount: 0,
        deferredItemsCount: 0,
      }
    );
  }

  private async findCycleInClient(clientId: string, id: string): Promise<CycleRow> {
    const row = await this.prisma.governanceCycle.findFirst({
      where: { id, clientId },
    });
    if (!row) throw new NotFoundException('Governance cycle not found');
    return row;
  }

  private assertNotArchived(row: CycleRow): void {
    if (row.status === GovernanceCycleStatus.ARCHIVED) {
      throw new ConflictException('archived governance cycle cannot be modified');
    }
  }

  async listCycles(
    clientId: string,
    query: ListGovernanceCyclesQueryDto,
  ): Promise<GovernanceCycleListResponseDto> {
    const { limit, offset } = normalizeListPagination(query.offset, query.limit);
    const includeArchived = query.includeArchived === true;
    const search = query.search?.trim();

    const where: Prisma.GovernanceCycleWhereInput = {
      clientId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.cadence ? { cadence: query.cadence } : {}),
      ...(!includeArchived && !query.status
        ? { status: { not: GovernanceCycleStatus.ARCHIVED } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.governanceCycle.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.governanceCycle.count({ where }),
    ]);

    const summaries = await this.buildSummariesForCycles(
      clientId,
      rows.map((r) => r.id),
    );

    return {
      items: rows.map((row) =>
        this.toResponse(row, summaries.get(row.id)!),
      ),
      total,
      limit,
      offset,
    };
  }

  async getCycleById(
    clientId: string,
    id: string,
  ): Promise<GovernanceCycleResponseDto> {
    const row = await this.findCycleInClient(clientId, id);
    const summary = await this.getSummaryForCycle(clientId, id);
    return this.toResponse(row, summary);
  }

  async createCycle(
    clientId: string,
    dto: CreateGovernanceCycleDto,
    context?: GovernanceAuditContext,
  ): Promise<GovernanceCycleResponseDto> {
    const created = await this.prisma.governanceCycle.create({
      data: {
        clientId,
        name: dto.name.trim(),
        code: dto.code?.trim() || null,
        description: dto.description?.trim() || null,
        cadence: dto.cadence,
        status: dto.status ?? GovernanceCycleStatus.DRAFT,
        startDate: this.parseOptionalDate(dto.startDate) ?? null,
        endDate: this.parseOptionalDate(dto.endDate) ?? null,
        sponsorLabel: dto.sponsorLabel?.trim() || null,
        objectiveSummary: dto.objectiveSummary?.trim() || null,
        decisionSummary: dto.decisionSummary?.trim() || null,
        createdByUserId: context?.actorUserId ?? null,
      },
    });

    await this.audit(
      clientId,
      context,
      'governance_cycle.created',
      created.id,
      undefined,
      this.cycleAuditSnapshot(created),
    );

    return this.getCycleById(clientId, created.id);
  }

  async updateCycle(
    clientId: string,
    id: string,
    dto: UpdateGovernanceCycleDto,
    context?: GovernanceAuditContext,
  ): Promise<GovernanceCycleResponseDto> {
    const existing = await this.findCycleInClient(clientId, id);
    this.assertNotArchived(existing);

    const data: Prisma.GovernanceCycleUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code?.trim() || null;
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.cadence !== undefined) data.cadence = dto.cadence;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.startDate !== undefined) {
      data.startDate = this.parseOptionalDate(dto.startDate) ?? null;
    }
    if (dto.endDate !== undefined) {
      data.endDate = this.parseOptionalDate(dto.endDate) ?? null;
    }
    if (dto.sponsorLabel !== undefined) {
      data.sponsorLabel = dto.sponsorLabel?.trim() || null;
    }
    if (dto.objectiveSummary !== undefined) {
      data.objectiveSummary = dto.objectiveSummary?.trim() || null;
    }
    if (dto.decisionSummary !== undefined) {
      data.decisionSummary = dto.decisionSummary?.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return this.getCycleById(clientId, id);
    }

    const updated = await this.prisma.governanceCycle.update({
      where: { id },
      data,
    });

    await this.audit(
      clientId,
      context,
      'governance_cycle.updated',
      id,
      this.cycleAuditSnapshot(existing),
      this.cycleAuditSnapshot(updated),
    );

    return this.getCycleById(clientId, id);
  }

  async archiveCycle(
    clientId: string,
    id: string,
    context?: GovernanceAuditContext,
  ): Promise<void> {
    const existing = await this.findCycleInClient(clientId, id);

    if (existing.status === GovernanceCycleStatus.ARCHIVED) {
      return;
    }

    const updated = await this.prisma.governanceCycle.update({
      where: { id },
      data: { status: GovernanceCycleStatus.ARCHIVED },
    });

    await this.audit(
      clientId,
      context,
      'governance_cycle.archived',
      id,
      { status: existing.status },
      { status: updated.status },
    );
  }
}
