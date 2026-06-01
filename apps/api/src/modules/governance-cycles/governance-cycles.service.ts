import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { satisfiesPermission } from '@starium-orchestra/rbac-permissions';
import {
  GovernanceCycleInstanceStatus,
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemSourceType,
  GovernanceCycleStatus,
  Prisma,
} from '@prisma/client';
import { EffectivePermissionsService } from '../../common/services/effective-permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { normalizeListPagination } from '../projects/lib/paginated-list.util';
import { CreateGovernanceCycleDto } from './dto/create-governance-cycle.dto';
import { CreateGovernanceCycleItemDto } from './dto/create-governance-cycle-item.dto';
import { ListGovernanceCycleItemsQueryDto } from './dto/list-governance-cycle-items-query.dto';
import { ListGovernanceCyclesQueryDto } from './dto/list-governance-cycles-query.dto';
import { UpdateGovernanceCycleDto } from './dto/update-governance-cycle.dto';
import { UpdateGovernanceCycleItemDto } from './dto/update-governance-cycle-item.dto';
import type {
  GovernanceCycleItemListResponseDto,
  GovernanceCycleItemResponseDto,
  GovernanceCycleItemSourceRefDto,
  GovernanceCycleByProjectItemDto,
  GovernanceCycleGlobalSummaryDto,
  GovernanceCycleListResponseDto,
  GovernanceCycleResponseDto,
  GovernanceCyclesByProjectResponseDto,
  GovernanceCycleSummaryDto,
} from './governance-cycles.types';
import { buildGovernanceCyclePeriodLabel } from './lib/governance-cycle-period.util';
import {
  GOVERNANCE_CYCLE_ITEM_ARBITRATION_KEYS,
  GOVERNANCE_CYCLE_ITEM_EDITION_KEYS,
  GOVERNANCE_CYCLE_ITEM_FK_KEYS,
  GOVERNANCE_CYCLE_ITEM_IMMUTABLE_PATCH_KEYS,
  IMMUTABLE_ITEM_SOURCE_MESSAGE,
  MANUAL_ITEM_FK_MESSAGE,
} from './lib/governance-cycle-item.constants';
import {
  PATCH_MIXED_EDITION_ARBITRATION_MESSAGE,
  parseOptionalDecimalString,
  serializeDecimal,
} from './lib/governance-cycle-decimal.util';
import {
  computePriorityScore,
  hasScorePatch,
  mergeItemScores,
  scoresFromDto,
  scoresFromItemRow,
} from './lib/governance-cycle-scoring.util';
import {
  DEFAULT_GOVERNANCE_CYCLE_CONFIG,
  governanceConfigFromDb,
  parseAndNormalizeGovernanceConfig,
} from './lib/governance-cycle-config.schema';
import { normalizeItemDecisionStatusForRead } from './lib/governance-cycle-item-status.util';
import { isGovernanceCyclesModuleActive } from './lib/governance-cycles-module.util';
import { SubmitProjectToCycleDto } from './dto/submit-project-to-cycle.dto';

type GovernanceAuditContext = {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
};

type GovernanceItemMutationContext = GovernanceAuditContext & {
  actorUserId: string;
};

const GOVERNANCE_CYCLE_RESOURCE_TYPE = 'governance_cycle';
const GOVERNANCE_CYCLE_ITEM_RESOURCE_TYPE = 'governance_cycle_item';

const governanceCycleItemInclude = {
  project: { select: { id: true, name: true, code: true } },
  budget: { select: { id: true, name: true, code: true } },
  budgetLine: { select: { id: true, name: true, code: true } },
  strategicObjective: { select: { id: true, title: true } },
  risk: { select: { id: true, title: true, code: true } },
} satisfies Prisma.GovernanceCycleItemInclude;

type GovernanceCycleItemRow = Prisma.GovernanceCycleItemGetPayload<{
  include: typeof governanceCycleItemInclude;
}>;

type ResolvedItemSource = {
  projectId: string | null;
  budgetId: string | null;
  budgetLineId: string | null;
  strategicObjectiveId: string | null;
  riskId: string | null;
  title: string;
};

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
  validatedByUserId: string | null;
  validatedAt: Date | null;
  closedAt: Date | null;
  governanceConfig: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

const GOVERNANCE_CYCLES_MODULE_INACTIVE = 'GOVERNANCE_CYCLES_MODULE_INACTIVE';
const GOVERNANCE_CYCLE_ITEM_ALREADY_DECIDED = 'GOVERNANCE_CYCLE_ITEM_ALREADY_DECIDED';
const GOVERNANCE_CYCLE_ITEM_DECISION_LOCKED_BY_INSTANCE =
  'GOVERNANCE_CYCLE_ITEM_DECISION_LOCKED_BY_INSTANCE';
const GOVERNANCE_CYCLES_PROPOSE_FORBIDDEN = 'GOVERNANCE_CYCLES_PROPOSE_FORBIDDEN';

const CANDIDACY_RESUBMIT_STATUSES: GovernanceCycleItemDecisionStatus[] = [
  GovernanceCycleItemDecisionStatus.CANDIDATE,
  GovernanceCycleItemDecisionStatus.DEFERRED,
  GovernanceCycleItemDecisionStatus.NEEDS_INFORMATION,
  GovernanceCycleItemDecisionStatus.TO_ARBITRATE,
];

@Injectable()
export class GovernanceCyclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly effectivePermissions: EffectivePermissionsService,
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
      validatedByUserId: row.validatedByUserId,
      validatedAt: row.validatedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
    };
  }

  private datesEqual(a: Date | null, b: Date | null): boolean {
    const aMs = a?.getTime() ?? null;
    const bMs = b?.getTime() ?? null;
    return aMs === bMs;
  }

  private async assertNoCandidateItems(
    clientId: string,
    cycleId: string,
  ): Promise<void> {
    const count = await this.prisma.governanceCycleItem.count({
      where: {
        clientId,
        cycleId,
        decisionStatus: GovernanceCycleItemDecisionStatus.CANDIDATE,
      },
    });
    if (count > 0) {
      throw new BadRequestException(
        'Cannot validate a governance cycle while items remain in CANDIDATE status',
      );
    }
  }

  private async assertCycleHasItems(
    clientId: string,
    cycleId: string,
  ): Promise<void> {
    const count = await this.prisma.governanceCycleItem.count({
      where: { clientId, cycleId },
    });
    if (count === 0) {
      throw new BadRequestException('Cannot close an empty governance cycle');
    }
  }

  private async assertNoPendingArbitrationItems(
    clientId: string,
    cycleId: string,
  ): Promise<void> {
    const count = await this.prisma.governanceCycleItem.count({
      where: {
        clientId,
        cycleId,
        decisionStatus: {
          in: [
            GovernanceCycleItemDecisionStatus.CANDIDATE,
            GovernanceCycleItemDecisionStatus.TO_ARBITRATE,
          ],
        },
      },
    });
    if (count > 0) {
      throw new BadRequestException(
        'Cannot close a governance cycle while items remain in CANDIDATE or TO_ARBITRATE status',
      );
    }
  }

  private parseOptionalDate(
    value: string | null | undefined,
  ): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return new Date(value);
  }

  private resolveConfig(
    raw: Prisma.JsonValue | null,
    allowBudget = false,
  ) {
    return governanceConfigFromDb(raw, {
      allowBudgetGovernancePropagation: allowBudget,
    });
  }

  private toResponse(
    row: CycleRow,
    summary: GovernanceCycleSummaryDto,
    allowBudget = false,
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
      governanceConfig: this.resolveConfig(row.governanceConfig, allowBudget),
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

  async listCyclesByProject(
    clientId: string,
    projectId: string,
  ): Promise<GovernanceCyclesByProjectResponseDto> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found for active client');
    }

    const rows = await this.prisma.governanceCycleItem.findMany({
      where: {
        clientId,
        projectId,
        cycle: { status: { not: GovernanceCycleStatus.ARCHIVED } },
      },
      select: {
        decisionStatus: true,
        priorityScore: true,
        cycle: {
          select: {
            id: true,
            name: true,
            cadence: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: [{ cycle: { updatedAt: 'desc' } }, { updatedAt: 'desc' }],
    });

    const itemIds = rows.map((r) => r.cycle.id);
    const lastDecisions = await this.prisma.governanceCycleInstanceDecision.findMany({
      where: {
        clientId,
        item: { projectId },
        instance: {
          status: GovernanceCycleInstanceStatus.CLOSED,
          cycleId: { in: itemIds.length ? itemIds : ['__none__'] },
        },
      },
      include: {
        instance: {
          select: {
            id: true,
            periodLabel: true,
            scheduledDecisionAt: true,
            closedAt: true,
            cycleId: true,
          },
        },
      },
      orderBy: [{ instance: { closedAt: 'desc' } }, { decidedAt: 'desc' }],
    });

    const lastByCycle = new Map<
      string,
      (typeof lastDecisions)[0]
    >();
    for (const d of lastDecisions) {
      const cycleId = d.instance.cycleId;
      if (!lastByCycle.has(cycleId)) {
        lastByCycle.set(cycleId, d);
      }
    }

    const items: GovernanceCycleByProjectItemDto[] = rows.map((row) => {
      const last = lastByCycle.get(row.cycle.id);
      return {
        cycleId: row.cycle.id,
        cycleName: row.cycle.name,
        cadence: row.cycle.cadence,
        periodLabel: buildGovernanceCyclePeriodLabel(
          row.cycle.startDate,
          row.cycle.endDate,
        ),
        decisionStatus: normalizeItemDecisionStatusForRead(row.decisionStatus),
        priorityScore: row.priorityScore,
        lastInstanceId: last?.instance.id ?? null,
        lastInstancePeriodLabel: last?.instance.periodLabel ?? null,
        lastInstanceScheduledDecisionAt:
          last?.instance.scheduledDecisionAt?.toISOString() ?? null,
      };
    });

    return { items };
  }

  async getCycleSummary(
    clientId: string,
    cycleId: string,
  ): Promise<GovernanceCycleGlobalSummaryDto> {
    await this.findCycleInClient(clientId, cycleId);

    const itemWhere = { clientId, cycleId };

    const [statusGroups, aggregates, highRiskItemsCount] = await Promise.all([
      this.prisma.governanceCycleItem.groupBy({
        by: ['decisionStatus'],
        where: itemWhere,
        _count: { _all: true },
      }),
      this.prisma.governanceCycleItem.aggregate({
        where: itemWhere,
        _sum: {
          estimatedBudgetAmount: true,
          estimatedCapacityDays: true,
        },
        _avg: {
          priorityScore: true,
        },
      }),
      this.prisma.governanceCycleItem.count({
        where: {
          ...itemWhere,
          riskScore: { gte: 4 },
        },
      }),
    ]);

    const countByStatus = new Map(
      statusGroups.map((group) => [group.decisionStatus, group._count._all]),
    );

    const candidateCount =
      countByStatus.get(GovernanceCycleItemDecisionStatus.CANDIDATE) ?? 0;
    const toArbitrateCount =
      countByStatus.get(GovernanceCycleItemDecisionStatus.TO_ARBITRATE) ?? 0;
    const acceptedCount =
      countByStatus.get(GovernanceCycleItemDecisionStatus.ACCEPTED) ?? 0;
    const deferredCount =
      countByStatus.get(GovernanceCycleItemDecisionStatus.DEFERRED) ?? 0;
    const rejectedCount =
      countByStatus.get(GovernanceCycleItemDecisionStatus.REJECTED) ?? 0;
    const needsInformationCount =
      countByStatus.get(GovernanceCycleItemDecisionStatus.NEEDS_INFORMATION) ??
      0;
    const acceptedWithReserveCount =
      countByStatus.get(
        GovernanceCycleItemDecisionStatus.ACCEPTED_WITH_RESERVE,
      ) ?? 0;

    const totalItems =
      candidateCount +
      toArbitrateCount +
      acceptedCount +
      deferredCount +
      rejectedCount +
      needsInformationCount +
      acceptedWithReserveCount;

    const avgRaw = aggregates._avg.priorityScore;
    const averagePriorityScore =
      avgRaw == null ? null : Math.round(avgRaw * 100) / 100;

    return {
      cycleId,
      totalItems,
      candidateCount,
      toArbitrateCount,
      acceptedCount,
      deferredCount,
      rejectedCount,
      needsInformationCount,
      acceptedWithReserveCount,
      estimatedBudgetTotal:
        serializeDecimal(aggregates._sum.estimatedBudgetAmount ?? null) ??
        '0.00',
      estimatedCapacityDaysTotal:
        serializeDecimal(aggregates._sum.estimatedCapacityDays ?? null) ??
        '0.00',
      averagePriorityScore,
      highRiskItemsCount,
      generatedAt: new Date().toISOString(),
    };
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
        governanceConfig: DEFAULT_GOVERNANCE_CYCLE_CONFIG as unknown as Prisma.InputJsonValue,
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

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name !== existing.name) data.name = name;
    }
    if (dto.code !== undefined) {
      const code = dto.code?.trim() || null;
      if (code !== existing.code) data.code = code;
    }
    if (dto.description !== undefined) {
      const description = dto.description?.trim() || null;
      if (description !== existing.description) data.description = description;
    }
    if (dto.cadence !== undefined && dto.cadence !== existing.cadence) {
      data.cadence = dto.cadence;
    }
    if (dto.status !== undefined && dto.status !== existing.status) {
      if (dto.status === GovernanceCycleStatus.ARCHIVED) {
        throw new BadRequestException(
          'Use DELETE /governance-cycles/:id to archive a cycle',
        );
      }
      data.status = dto.status;
      if (
        existing.status === GovernanceCycleStatus.CLOSED &&
        dto.status !== GovernanceCycleStatus.CLOSED
      ) {
        data.closedAt = null;
      }
    }
    if (dto.startDate !== undefined) {
      const startDate = this.parseOptionalDate(dto.startDate) ?? null;
      if (!this.datesEqual(startDate, existing.startDate)) {
        data.startDate = startDate;
      }
    }
    if (dto.endDate !== undefined) {
      const endDate = this.parseOptionalDate(dto.endDate) ?? null;
      if (!this.datesEqual(endDate, existing.endDate)) {
        data.endDate = endDate;
      }
    }
    if (dto.sponsorLabel !== undefined) {
      const sponsorLabel = dto.sponsorLabel?.trim() || null;
      if (sponsorLabel !== existing.sponsorLabel) data.sponsorLabel = sponsorLabel;
    }
    if (dto.objectiveSummary !== undefined) {
      const objectiveSummary = dto.objectiveSummary?.trim() || null;
      if (objectiveSummary !== existing.objectiveSummary) {
        data.objectiveSummary = objectiveSummary;
      }
    }
    if (dto.decisionSummary !== undefined) {
      const decisionSummary = dto.decisionSummary?.trim() || null;
      if (decisionSummary !== existing.decisionSummary) {
        data.decisionSummary = decisionSummary;
      }
    }

    if (dto.governanceConfig !== undefined) {
      const allowBudget =
        typeof this.prisma.budgetGovernanceDecision?.create === 'function';
      const normalized = parseAndNormalizeGovernanceConfig(dto.governanceConfig, {
        allowBudgetGovernancePropagation: allowBudget,
      });
      data.governanceConfig = normalized as unknown as Prisma.InputJsonValue;
      await this.audit(
        clientId,
        context,
        'governance_cycle.config_updated',
        id,
        undefined,
        { governanceConfig: normalized as unknown as Prisma.JsonObject },
      );
    }

    if (Object.keys(data).length === 0) {
      return this.getCycleById(clientId, id);
    }

    const transitioningToArbitrate =
      data.status === GovernanceCycleStatus.TO_ARBITRATE;
    const transitioningToClosed = data.status === GovernanceCycleStatus.CLOSED;

    if (transitioningToArbitrate) {
      await this.assertNoCandidateItems(clientId, id);
      if (!context?.actorUserId) {
        throw new ForbiddenException('Contexte utilisateur manquant');
      }
      data.validatedAt = new Date();
      data.validatedByUserId = context.actorUserId;
    }

    if (transitioningToClosed) {
      await this.assertCycleHasItems(clientId, id);
      await this.assertNoPendingArbitrationItems(clientId, id);
      data.closedAt = new Date();
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

    if (transitioningToArbitrate) {
      await this.audit(
        clientId,
        context,
        'governance_cycle.validated',
        id,
        {
          status: existing.status,
          validatedAt: existing.validatedAt?.toISOString() ?? null,
          validatedByUserId: existing.validatedByUserId,
        },
        {
          status: updated.status,
          validatedAt: updated.validatedAt?.toISOString() ?? null,
          validatedByUserId: updated.validatedByUserId,
        },
      );
    }

    if (transitioningToClosed) {
      await this.audit(
        clientId,
        context,
        'governance_cycle.closed',
        id,
        {
          status: existing.status,
          closedAt: existing.closedAt?.toISOString() ?? null,
        },
        {
          status: updated.status,
          closedAt: updated.closedAt?.toISOString() ?? null,
        },
      );
    }

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

  private async resolveStatusAfterRestore(
    clientId: string,
    row: CycleRow,
  ): Promise<GovernanceCycleStatus> {
    const archivedLog = await this.prisma.auditLog.findFirst({
      where: {
        clientId,
        resourceType: GOVERNANCE_CYCLE_RESOURCE_TYPE,
        resourceId: row.id,
        action: 'governance_cycle.archived',
      },
      orderBy: { createdAt: 'desc' },
      select: { oldValue: true },
    });
    const previous = archivedLog?.oldValue as { status?: GovernanceCycleStatus } | null;
    if (
      previous?.status &&
      previous.status !== GovernanceCycleStatus.ARCHIVED
    ) {
      return previous.status;
    }
    if (row.closedAt) return GovernanceCycleStatus.CLOSED;
    if (row.validatedAt) return GovernanceCycleStatus.TO_ARBITRATE;
    return GovernanceCycleStatus.DRAFT;
  }

  async restoreCycle(
    clientId: string,
    id: string,
    context?: GovernanceAuditContext,
  ): Promise<GovernanceCycleResponseDto> {
    const existing = await this.findCycleInClient(clientId, id);

    if (existing.status !== GovernanceCycleStatus.ARCHIVED) {
      return this.getCycleById(clientId, id);
    }

    const restoredStatus = await this.resolveStatusAfterRestore(clientId, existing);

    const updated = await this.prisma.governanceCycle.update({
      where: { id },
      data: { status: restoredStatus },
    });

    await this.audit(
      clientId,
      context,
      'governance_cycle.restored',
      id,
      { status: existing.status },
      { status: updated.status },
    );

    return this.getCycleById(clientId, id);
  }

  private keysPresent(
    dto: Record<string, unknown>,
    keys: readonly string[],
  ): string[] {
    return keys.filter((key) => dto[key] !== undefined);
  }

  private assertNoFkKeysInDto(dto: Record<string, unknown>): void {
    for (const key of GOVERNANCE_CYCLE_ITEM_FK_KEYS) {
      if (key in dto && dto[key] !== undefined) {
        throw new BadRequestException(MANUAL_ITEM_FK_MESSAGE);
      }
    }
  }

  private formatEntityLabel(
    parts: { code?: string | null; name?: string | null; title?: string | null },
  ): string {
    const primary = parts.title ?? parts.name ?? '';
    if (parts.code?.trim()) {
      return `${parts.code.trim()} — ${primary}`;
    }
    return primary;
  }

  private buildSourceRef(row: GovernanceCycleItemRow): GovernanceCycleItemSourceRefDto | null {
    switch (row.sourceType) {
      case GovernanceCycleItemSourceType.PROJECT:
        if (!row.project) return null;
        return {
          id: row.project.id,
          label: this.formatEntityLabel({
            code: row.project.code,
            name: row.project.name,
          }),
        };
      case GovernanceCycleItemSourceType.BUDGET:
        if (!row.budget) return null;
        return {
          id: row.budget.id,
          label: this.formatEntityLabel({
            code: row.budget.code,
            name: row.budget.name,
          }),
        };
      case GovernanceCycleItemSourceType.BUDGET_LINE:
        if (!row.budgetLine) return null;
        return {
          id: row.budgetLine.id,
          label: this.formatEntityLabel({
            code: row.budgetLine.code,
            name: row.budgetLine.name,
          }),
        };
      case GovernanceCycleItemSourceType.STRATEGIC_OBJECTIVE:
        if (!row.strategicObjective) return null;
        return {
          id: row.strategicObjective.id,
          label: row.strategicObjective.title,
        };
      case GovernanceCycleItemSourceType.RISK:
        if (!row.risk) return null;
        return {
          id: row.risk.id,
          label: this.formatEntityLabel({
            code: row.risk.code,
            title: row.risk.title,
          }),
        };
      case GovernanceCycleItemSourceType.MANUAL:
        return null;
      default:
        return null;
    }
  }

  private toItemResponse(row: GovernanceCycleItemRow): GovernanceCycleItemResponseDto {
    return {
      id: row.id,
      cycleId: row.cycleId,
      sourceType: row.sourceType,
      title: row.title,
      description: row.description,
      decisionStatus: normalizeItemDecisionStatusForRead(row.decisionStatus),
      decisionReason: row.decisionReason,
      valueScore: row.valueScore,
      riskScore: row.riskScore,
      budgetScore: row.budgetScore,
      capacityScore: row.capacityScore,
      alignmentScore: row.alignmentScore,
      priorityScore: row.priorityScore,
      estimatedBudgetAmount: serializeDecimal(row.estimatedBudgetAmount),
      estimatedCapacityDays: serializeDecimal(row.estimatedCapacityDays),
      projectId: row.projectId,
      budgetId: row.budgetId,
      budgetLineId: row.budgetLineId,
      strategicObjectiveId: row.strategicObjectiveId,
      riskId: row.riskId,
      sourceRef: this.buildSourceRef(row),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private itemAuditSnapshot(row: GovernanceCycleItemRow): Prisma.JsonObject {
    return {
      sourceType: row.sourceType,
      title: row.title,
      decisionStatus: row.decisionStatus,
      decisionReason: row.decisionReason,
      valueScore: row.valueScore,
      riskScore: row.riskScore,
      budgetScore: row.budgetScore,
      capacityScore: row.capacityScore,
      alignmentScore: row.alignmentScore,
      priorityScore: row.priorityScore,
      projectId: row.projectId,
      budgetId: row.budgetId,
      budgetLineId: row.budgetLineId,
      strategicObjectiveId: row.strategicObjectiveId,
      riskId: row.riskId,
    };
  }

  private resolveScoresForCreate(
    dto: CreateGovernanceCycleItemDto,
  ): {
    valueScore: number | null;
    riskScore: number | null;
    budgetScore: number | null;
    capacityScore: number | null;
    alignmentScore: number | null;
    priorityScore: number | null;
  } {
    const scores = scoresFromDto(dto);
    return {
      ...scores,
      priorityScore: computePriorityScore(scores),
    };
  }

  private resolveScoresForUpdate(
    existing: GovernanceCycleItemRow,
    dto: UpdateGovernanceCycleItemDto,
    dtoRecord: Record<string, unknown>,
  ): {
    valueScore: number | null;
    riskScore: number | null;
    budgetScore: number | null;
    capacityScore: number | null;
    alignmentScore: number | null;
    priorityScore: number | null;
  } | null {
    if (!hasScorePatch(dtoRecord)) {
      return null;
    }

    const merged = mergeItemScores(scoresFromItemRow(existing), dto);
    return {
      ...merged,
      priorityScore: computePriorityScore(merged),
    };
  }

  private async auditItem(
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
      resourceType: GOVERNANCE_CYCLE_ITEM_RESOURCE_TYPE,
      resourceId,
      oldValue,
      newValue,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  private async assertActorHasPermission(
    clientId: string,
    actorUserId: string,
    permissionCode: string,
  ): Promise<void> {
    const codes = await this.effectivePermissions.resolvePermissionCodesForRequest({
      userId: actorUserId,
      clientId,
    });
    if (!satisfiesPermission(codes, permissionCode)) {
      throw new ForbiddenException(
        'Permissions insuffisantes pour accéder à cette ressource',
      );
    }
  }

  private async resolveSourceForCreate(
    clientId: string,
    dto: CreateGovernanceCycleItemDto,
  ): Promise<ResolvedItemSource> {
    const emptyFks = {
      projectId: null,
      budgetId: null,
      budgetLineId: null,
      strategicObjectiveId: null,
      riskId: null,
    };

    if (dto.sourceType === GovernanceCycleItemSourceType.MANUAL) {
      this.assertNoFkKeysInDto(dto as unknown as Record<string, unknown>);
      const title = dto.title?.trim();
      if (!title) {
        throw new BadRequestException('title is required for MANUAL items');
      }
      return { ...emptyFks, title };
    }

    switch (dto.sourceType) {
      case GovernanceCycleItemSourceType.PROJECT: {
        if (!dto.projectId) {
          throw new BadRequestException('projectId is required for PROJECT items');
        }
        if (
          dto.budgetId !== undefined ||
          dto.budgetLineId !== undefined ||
          dto.strategicObjectiveId !== undefined ||
          dto.riskId !== undefined
        ) {
          throw new BadRequestException('incoherent sourceType and reference ids');
        }
        const project = await this.prisma.project.findFirst({
          where: { id: dto.projectId, clientId },
          select: { id: true, name: true },
        });
        if (!project) {
          throw new NotFoundException('Project not found for active client');
        }
        return {
          ...emptyFks,
          projectId: project.id,
          title: dto.title?.trim() || project.name,
        };
      }
      case GovernanceCycleItemSourceType.BUDGET: {
        if (!dto.budgetId) {
          throw new BadRequestException('budgetId is required for BUDGET items');
        }
        if (
          dto.projectId !== undefined ||
          dto.budgetLineId !== undefined ||
          dto.strategicObjectiveId !== undefined ||
          dto.riskId !== undefined
        ) {
          throw new BadRequestException('incoherent sourceType and reference ids');
        }
        const budget = await this.prisma.budget.findFirst({
          where: { id: dto.budgetId, clientId },
          select: { id: true, name: true },
        });
        if (!budget) {
          throw new NotFoundException('Budget not found for active client');
        }
        return {
          ...emptyFks,
          budgetId: budget.id,
          title: dto.title?.trim() || budget.name,
        };
      }
      case GovernanceCycleItemSourceType.BUDGET_LINE: {
        if (!dto.budgetLineId) {
          throw new BadRequestException('budgetLineId is required for BUDGET_LINE items');
        }
        if (
          dto.projectId !== undefined ||
          dto.budgetId !== undefined ||
          dto.strategicObjectiveId !== undefined ||
          dto.riskId !== undefined
        ) {
          throw new BadRequestException('incoherent sourceType and reference ids');
        }
        const budgetLine = await this.prisma.budgetLine.findFirst({
          where: { id: dto.budgetLineId, clientId },
          select: { id: true, name: true },
        });
        if (!budgetLine) {
          throw new NotFoundException('Budget line not found for active client');
        }
        return {
          ...emptyFks,
          budgetLineId: budgetLine.id,
          title: dto.title?.trim() || budgetLine.name,
        };
      }
      case GovernanceCycleItemSourceType.STRATEGIC_OBJECTIVE: {
        if (!dto.strategicObjectiveId) {
          throw new BadRequestException(
            'strategicObjectiveId is required for STRATEGIC_OBJECTIVE items',
          );
        }
        if (
          dto.projectId !== undefined ||
          dto.budgetId !== undefined ||
          dto.budgetLineId !== undefined ||
          dto.riskId !== undefined
        ) {
          throw new BadRequestException('incoherent sourceType and reference ids');
        }
        const objective = await this.prisma.strategicObjective.findFirst({
          where: { id: dto.strategicObjectiveId, clientId },
          select: { id: true, title: true },
        });
        if (!objective) {
          throw new NotFoundException(
            'Strategic objective not found for active client',
          );
        }
        return {
          ...emptyFks,
          strategicObjectiveId: objective.id,
          title: dto.title?.trim() || objective.title,
        };
      }
      case GovernanceCycleItemSourceType.RISK: {
        if (!dto.riskId) {
          throw new BadRequestException('riskId is required for RISK items');
        }
        if (
          dto.projectId !== undefined ||
          dto.budgetId !== undefined ||
          dto.budgetLineId !== undefined ||
          dto.strategicObjectiveId !== undefined
        ) {
          throw new BadRequestException('incoherent sourceType and reference ids');
        }
        const risk = await this.prisma.projectRisk.findFirst({
          where: { id: dto.riskId, clientId },
          select: { id: true, title: true },
        });
        if (!risk) {
          throw new NotFoundException('Project risk not found for active client');
        }
        return {
          ...emptyFks,
          riskId: risk.id,
          title: dto.title?.trim() || risk.title,
        };
      }
      default:
        throw new BadRequestException('unsupported sourceType');
    }
  }

  private async findItemInCycle(
    clientId: string,
    cycleId: string,
    itemId: string,
  ): Promise<GovernanceCycleItemRow> {
    const row = await this.prisma.governanceCycleItem.findFirst({
      where: { id: itemId, clientId, cycleId },
      include: governanceCycleItemInclude,
    });
    if (!row) {
      throw new NotFoundException('Governance cycle item not found');
    }
    return row;
  }

  private async assertCycleMutable(
    clientId: string,
    cycleId: string,
  ): Promise<CycleRow> {
    const cycle = await this.findCycleInClient(clientId, cycleId);
    this.assertNotArchived(cycle);
    return cycle;
  }

  async listItems(
    clientId: string,
    cycleId: string,
    query: ListGovernanceCycleItemsQueryDto,
  ): Promise<GovernanceCycleItemListResponseDto> {
    await this.findCycleInClient(clientId, cycleId);
    const { limit, offset } = normalizeListPagination(query.offset, query.limit);
    const search = query.search?.trim();

    const where: Prisma.GovernanceCycleItemWhereInput = {
      clientId,
      cycleId,
      ...(query.decisionStatus ? { decisionStatus: query.decisionStatus } : {}),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
      ...(search
        ? { title: { contains: search, mode: 'insensitive' } }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.governanceCycleItem.findMany({
        where,
        include: governanceCycleItemInclude,
        orderBy: [
          { priorityScore: { sort: 'desc', nulls: 'last' } },
          { updatedAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      }),
      this.prisma.governanceCycleItem.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toItemResponse(row)),
      total,
      limit,
      offset,
    };
  }

  async getItemById(
    clientId: string,
    cycleId: string,
    itemId: string,
  ): Promise<GovernanceCycleItemResponseDto> {
    const row = await this.findItemInCycle(clientId, cycleId, itemId);
    return this.toItemResponse(row);
  }

  async createItem(
    clientId: string,
    cycleId: string,
    dto: CreateGovernanceCycleItemDto,
    context?: GovernanceAuditContext,
  ): Promise<GovernanceCycleItemResponseDto> {
    await this.assertCycleMutable(clientId, cycleId);
    const resolved = await this.resolveSourceForCreate(clientId, dto);

    const estimatedBudgetAmount = parseOptionalDecimalString(
      dto.estimatedBudgetAmount,
      'estimatedBudgetAmount',
      2,
    );
    const estimatedCapacityDays = parseOptionalDecimalString(
      dto.estimatedCapacityDays,
      'estimatedCapacityDays',
      2,
    );
    const resolvedScores = this.resolveScoresForCreate(dto);

    try {
      const created = await this.prisma.governanceCycleItem.create({
        data: {
          clientId,
          cycleId,
          sourceType: dto.sourceType,
          title: resolved.title,
          description: dto.description?.trim() || null,
          projectId: resolved.projectId,
          budgetId: resolved.budgetId,
          budgetLineId: resolved.budgetLineId,
          strategicObjectiveId: resolved.strategicObjectiveId,
          riskId: resolved.riskId,
          valueScore: resolvedScores.valueScore,
          riskScore: resolvedScores.riskScore,
          budgetScore: resolvedScores.budgetScore,
          capacityScore: resolvedScores.capacityScore,
          alignmentScore: resolvedScores.alignmentScore,
          priorityScore: resolvedScores.priorityScore,
          estimatedBudgetAmount: estimatedBudgetAmount ?? null,
          estimatedCapacityDays: estimatedCapacityDays ?? null,
        },
        include: governanceCycleItemInclude,
      });

      await this.auditItem(
        clientId,
        context,
        'governance_cycle_item.created',
        created.id,
        undefined,
        this.itemAuditSnapshot(created),
      );

      return this.toItemResponse(created);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'This project is already present in the governance cycle',
        );
      }
      throw e;
    }
  }

  async updateItem(
    clientId: string,
    cycleId: string,
    itemId: string,
    dto: UpdateGovernanceCycleItemDto,
    context: GovernanceItemMutationContext,
  ): Promise<GovernanceCycleItemResponseDto> {
    await this.assertCycleMutable(clientId, cycleId);
    const existing = await this.findItemInCycle(clientId, cycleId, itemId);
    const dtoRecord = dto as unknown as Record<string, unknown>;

    const immutableKeys = this.keysPresent(
      dtoRecord,
      GOVERNANCE_CYCLE_ITEM_IMMUTABLE_PATCH_KEYS,
    );
    if (immutableKeys.length > 0) {
      throw new BadRequestException(IMMUTABLE_ITEM_SOURCE_MESSAGE);
    }

    const editionKeys = this.keysPresent(
      dtoRecord,
      GOVERNANCE_CYCLE_ITEM_EDITION_KEYS,
    );
    const arbitrationKeys = this.keysPresent(
      dtoRecord,
      GOVERNANCE_CYCLE_ITEM_ARBITRATION_KEYS,
    );

    if (editionKeys.length > 0 && arbitrationKeys.length > 0) {
      throw new BadRequestException(PATCH_MIXED_EDITION_ARBITRATION_MESSAGE);
    }

    if (editionKeys.length === 0 && arbitrationKeys.length === 0) {
      return this.toItemResponse(existing);
    }

    if (editionKeys.length > 0) {
      await this.assertActorHasPermission(
        clientId,
        context.actorUserId,
        'governance_cycles.update',
      );
    }
    if (arbitrationKeys.length > 0) {
      await this.assertActorHasPermission(
        clientId,
        context.actorUserId,
        'governance_cycles.arbitrate',
      );
      const locked = await this.prisma.governanceCycleInstanceAgendaItem.findFirst({
        where: {
          clientId,
          itemId,
          instance: {
            cycleId,
            status: GovernanceCycleInstanceStatus.OPEN,
          },
        },
        select: { id: true },
      });
      if (locked) {
        throw new BadRequestException({
          code: GOVERNANCE_CYCLE_ITEM_DECISION_LOCKED_BY_INSTANCE,
          message:
            'Item decision must be updated via the open governance cycle instance',
        });
      }
    }

    const data: Prisma.GovernanceCycleItemUncheckedUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.estimatedBudgetAmount !== undefined) {
      data.estimatedBudgetAmount = parseOptionalDecimalString(
        dto.estimatedBudgetAmount,
        'estimatedBudgetAmount',
        2,
      ) ?? null;
    }
    if (dto.estimatedCapacityDays !== undefined) {
      data.estimatedCapacityDays = parseOptionalDecimalString(
        dto.estimatedCapacityDays,
        'estimatedCapacityDays',
        2,
      ) ?? null;
    }
    if (dto.decisionStatus !== undefined) data.decisionStatus = dto.decisionStatus;
    if (dto.decisionReason !== undefined) {
      data.decisionReason = dto.decisionReason?.trim() || null;
    }

    const resolvedScores = this.resolveScoresForUpdate(existing, dto, dtoRecord);
    if (resolvedScores) {
      data.valueScore = resolvedScores.valueScore;
      data.riskScore = resolvedScores.riskScore;
      data.budgetScore = resolvedScores.budgetScore;
      data.capacityScore = resolvedScores.capacityScore;
      data.alignmentScore = resolvedScores.alignmentScore;
      data.priorityScore = resolvedScores.priorityScore;
    }

    const updated = await this.prisma.governanceCycleItem.update({
      where: { id: itemId },
      data,
      include: governanceCycleItemInclude,
    });

    const decisionChanged =
      arbitrationKeys.length > 0 &&
      (existing.decisionStatus !== updated.decisionStatus ||
        existing.decisionReason !== updated.decisionReason);

    if (editionKeys.length > 0) {
      await this.auditItem(
        clientId,
        context,
        'governance_cycle_item.updated',
        itemId,
        this.itemAuditSnapshot(existing),
        this.itemAuditSnapshot(updated),
      );
    }

    if (decisionChanged) {
      await this.auditItem(
        clientId,
        context,
        'governance_cycle_item.decision_changed',
        itemId,
        {
          decisionStatus: existing.decisionStatus,
          decisionReason: existing.decisionReason,
        },
        {
          decisionStatus: updated.decisionStatus,
          decisionReason: updated.decisionReason,
        },
      );
    }

    return this.toItemResponse(updated);
  }

  async deleteItem(
    clientId: string,
    cycleId: string,
    itemId: string,
    context?: GovernanceAuditContext,
  ): Promise<void> {
    await this.assertCycleMutable(clientId, cycleId);
    const existing = await this.findItemInCycle(clientId, cycleId, itemId);

    await this.prisma.governanceCycleItem.delete({ where: { id: itemId } });

    await this.auditItem(
      clientId,
      context,
      'governance_cycle_item.deleted',
      itemId,
      this.itemAuditSnapshot(existing),
      undefined,
    );
  }

  async submitProjectCandidacy(
    clientId: string,
    cycleId: string,
    dto: SubmitProjectToCycleDto,
    context: GovernanceItemMutationContext,
  ): Promise<GovernanceCycleItemResponseDto> {
    const active = await isGovernanceCyclesModuleActive(this.prisma, clientId);
    if (!active) {
      throw new NotFoundException({
        code: GOVERNANCE_CYCLES_MODULE_INACTIVE,
        message: 'Governance cycles module is not active for this client',
      });
    }

    await this.assertActorHasPermission(
      clientId,
      context.actorUserId,
      'governance_cycles.propose',
    );

    await this.findCycleInClient(clientId, cycleId);

    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, clientId },
      select: { id: true, name: true, code: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found for active client');
    }

    const existing = await this.prisma.governanceCycleItem.findUnique({
      where: {
        cycleId_projectId: { cycleId, projectId: dto.projectId },
      },
      include: governanceCycleItemInclude,
    });

    if (
      existing &&
      !CANDIDACY_RESUBMIT_STATUSES.includes(existing.decisionStatus)
    ) {
      throw new ConflictException({
        code: GOVERNANCE_CYCLE_ITEM_ALREADY_DECIDED,
        message: 'Project already has a final decision on this cycle',
      });
    }

    const title =
      project.code && project.name
        ? `${project.code} — ${project.name}`
        : project.name;

    const row = existing
      ? await this.prisma.governanceCycleItem.update({
          where: { id: existing.id },
          data: {
            decisionStatus: GovernanceCycleItemDecisionStatus.CANDIDATE,
            decisionReason: null,
          },
          include: governanceCycleItemInclude,
        })
      : await this.prisma.governanceCycleItem.create({
          data: {
            clientId,
            cycleId,
            sourceType: GovernanceCycleItemSourceType.PROJECT,
            projectId: dto.projectId,
            title,
            decisionStatus: GovernanceCycleItemDecisionStatus.CANDIDATE,
          },
          include: governanceCycleItemInclude,
        });

    await this.auditItem(
      clientId,
      context,
      'governance_cycle.candidacy.submitted',
      row.id,
      existing ? this.itemAuditSnapshot(existing) : undefined,
      this.itemAuditSnapshot(row),
    );

    return this.toItemResponse(row);
  }
}
