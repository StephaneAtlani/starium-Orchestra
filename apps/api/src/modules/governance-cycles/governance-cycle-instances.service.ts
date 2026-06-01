import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GovernanceCycleInstanceStatus,
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateGovernanceCycleInstanceDto } from './dto/create-governance-cycle-instance.dto';
import { ListGovernanceCycleInstancesQueryDto } from './dto/list-governance-cycle-instances-query.dto';
import { ReplaceInstanceAgendaDto } from './dto/replace-instance-agenda.dto';
import { UpdateGovernanceCycleInstanceDto } from './dto/update-governance-cycle-instance.dto';
import { UpsertInstanceItemDecisionsDto } from './dto/upsert-instance-item-decisions.dto';
import { GovernanceCyclePropagationService } from './governance-cycle-propagation.service';
import { GovernanceCycleReadinessService } from './governance-cycle-readiness.service';
import { GovernanceCyclesService } from './governance-cycles.service';
import type {
  GovernanceCycleInstanceDetailDto,
  GovernanceCycleInstanceListResponseDto,
  GovernanceCycleInstanceResponseDto,
} from './governance-cycle-instances.types';
import {
  governanceConfigFromDb,
  type NormalizedGovernanceCycleConfig,
} from './lib/governance-cycle-config.schema';
import { buildGeneratedInstancePeriodLabel } from './lib/governance-cycle-instance-labels.util';
import {
  INSTANCE_FINAL_DECISION_STATUSES,
  isItemUndecidedForInstanceClose,
  isValidInstanceFinalDecision,
  normalizeItemDecisionStatusForRead,
} from './lib/governance-cycle-item-status.util';

type InstanceAuditContext = {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
};

const INSTANCE_RESOURCE = 'governance_cycle_instance';

type InstanceRow = Prisma.GovernanceCycleInstanceGetPayload<{
  include: { agendaItems: true; decisions: true };
}>;

@Injectable()
export class GovernanceCycleInstancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly cycles: GovernanceCyclesService,
    private readonly readiness: GovernanceCycleReadinessService,
    private readonly propagation: GovernanceCyclePropagationService,
  ) {}

  private async findCycle(clientId: string, cycleId: string) {
    const cycle = await this.prisma.governanceCycle.findFirst({
      where: { id: cycleId, clientId },
    });
    if (!cycle) throw new NotFoundException('Governance cycle not found');
    if (cycle.status === GovernanceCycleStatus.ARCHIVED) {
      throw new ConflictException('archived governance cycle cannot be modified');
    }
    return cycle;
  }

  private async findInstance(
    clientId: string,
    cycleId: string,
    instanceId: string,
  ): Promise<InstanceRow> {
    const row = await this.prisma.governanceCycleInstance.findFirst({
      where: { id: instanceId, clientId, cycleId },
      include: { agendaItems: true, decisions: true },
    });
    if (!row) throw new NotFoundException('Governance cycle instance not found');
    return row;
  }

  private parseDate(value: string | undefined): Date | undefined {
    if (!value) return undefined;
    return new Date(value);
  }

  private parseDateOnly(value: string | undefined): Date | undefined {
    if (!value) return undefined;
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private resolveInitialStatus(
    dto: CreateGovernanceCycleInstanceDto,
  ): GovernanceCycleInstanceStatus {
    if (dto.periodLabel?.trim() && dto.scheduledDecisionAt) {
      return GovernanceCycleInstanceStatus.PLANNED;
    }
    return GovernanceCycleInstanceStatus.DRAFT;
  }

  private assertPlannedFields(
    periodLabel: string | null | undefined,
    scheduledDecisionAt: Date | null | undefined,
    targetStatus: GovernanceCycleInstanceStatus,
  ): void {
    const needs =
      targetStatus === GovernanceCycleInstanceStatus.PLANNED ||
      targetStatus === GovernanceCycleInstanceStatus.OPEN ||
      targetStatus === GovernanceCycleInstanceStatus.CLOSED;
    if (!needs) return;
    if (!periodLabel?.trim() || !scheduledDecisionAt) {
      throw new BadRequestException(
        'periodLabel and scheduledDecisionAt are required for this instance status',
      );
    }
  }

  private async toInstanceResponse(
    row: InstanceRow,
  ): Promise<GovernanceCycleInstanceResponseDto> {
    const decidedCount = row.decisions.filter(
      (d) => d.decidedAt != null,
    ).length;
    return {
      id: row.id,
      cycleId: row.cycleId,
      periodLabel: row.periodLabel,
      periodStartDate: row.periodStartDate?.toISOString().slice(0, 10) ?? null,
      periodEndDate: row.periodEndDate?.toISOString().slice(0, 10) ?? null,
      label: row.label,
      scheduledDecisionAt: row.scheduledDecisionAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      mode: row.mode,
      status: row.status,
      locationLabel: row.locationLabel,
      meetingUrl: row.meetingUrl,
      decisionSummary: row.decisionSummary,
      openedAt: row.openedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      closedByUserId: row.closedByUserId,
      agendaCount: row.agendaItems.length,
      decidedCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async auditInstance(
    clientId: string,
    context: InstanceAuditContext | undefined,
    action: string,
    resourceId: string,
    oldValue?: Prisma.JsonObject,
    newValue?: Prisma.JsonObject,
  ) {
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: INSTANCE_RESOURCE,
      resourceId,
      oldValue,
      newValue,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async listInstances(
    clientId: string,
    cycleId: string,
    query: ListGovernanceCycleInstancesQueryDto,
  ): Promise<GovernanceCycleInstanceListResponseDto> {
    await this.findCycle(clientId, cycleId);
    const includeArchived = query.includeArchived === true;
    const rows = await this.prisma.governanceCycleInstance.findMany({
      where: {
        clientId,
        cycleId,
        ...(!includeArchived
          ? { status: { not: GovernanceCycleInstanceStatus.ARCHIVED } }
          : {}),
      },
      include: { agendaItems: true, decisions: true },
      orderBy: [{ scheduledDecisionAt: 'asc' }, { createdAt: 'asc' }],
    });
    const items = await Promise.all(rows.map((r) => this.toInstanceResponse(r)));
    return { items };
  }

  async createInstance(
    clientId: string,
    cycleId: string,
    dto: CreateGovernanceCycleInstanceDto,
    context?: InstanceAuditContext,
  ): Promise<GovernanceCycleInstanceResponseDto> {
    await this.findCycle(clientId, cycleId);
    const status = this.resolveInitialStatus(dto);
    const periodLabel = dto.periodLabel?.trim() || null;
    const scheduledDecisionAt = this.parseDate(dto.scheduledDecisionAt) ?? null;
    this.assertPlannedFields(periodLabel, scheduledDecisionAt, status);

    const created = await this.prisma.governanceCycleInstance.create({
      data: {
        clientId,
        cycleId,
        periodLabel,
        periodStartDate: dto.periodStartDate
          ? this.parseDateOnly(dto.periodStartDate)
          : null,
        periodEndDate: dto.periodEndDate
          ? this.parseDateOnly(dto.periodEndDate)
          : null,
        label: dto.label?.trim() || null,
        scheduledDecisionAt,
        endsAt: dto.endsAt ? this.parseDate(dto.endsAt) : null,
        mode: dto.mode ?? 'MEETING',
        status,
        locationLabel: dto.locationLabel?.trim() || null,
        meetingUrl: dto.meetingUrl?.trim() || null,
        decisionSummary: dto.decisionSummary?.trim() || null,
      },
      include: { agendaItems: true, decisions: true },
    });

    await this.auditInstance(clientId, context, 'governance_cycle_instance.created', created.id, undefined, {
      cycleId,
      status: created.status,
      periodLabel: created.periodLabel,
    });

    return this.toInstanceResponse(created);
  }

  async getInstance(
    clientId: string,
    cycleId: string,
    instanceId: string,
  ): Promise<GovernanceCycleInstanceDetailDto> {
    const row = await this.findInstance(clientId, cycleId, instanceId);
    const base = await this.toInstanceResponse(row);
    const agenda = await Promise.all(
      row.agendaItems
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(async (a) => {
          const item = await this.cycles.getItemById(clientId, cycleId, a.itemId);
          return { itemId: a.itemId, sortOrder: a.sortOrder, item };
        }),
    );
    const decisions = row.decisions.map((d) => ({
      id: d.id,
      itemId: d.itemId,
      decisionStatus: normalizeItemDecisionStatusForRead(d.decisionStatus),
      decisionReason: d.decisionReason,
      decidedAt: d.decidedAt?.toISOString() ?? null,
      decidedByUserId: d.decidedByUserId,
    }));
    return { ...base, agenda, decisions };
  }

  async updateInstance(
    clientId: string,
    cycleId: string,
    instanceId: string,
    dto: UpdateGovernanceCycleInstanceDto,
    context?: InstanceAuditContext,
  ): Promise<GovernanceCycleInstanceResponseDto> {
    const existing = await this.findInstance(clientId, cycleId, instanceId);
    if (
      existing.status !== GovernanceCycleInstanceStatus.DRAFT &&
      existing.status !== GovernanceCycleInstanceStatus.PLANNED
    ) {
      throw new ConflictException('Only DRAFT or PLANNED instances can be edited');
    }

    const periodLabel =
      dto.periodLabel !== undefined ? dto.periodLabel.trim() || null : existing.periodLabel;
    const scheduledDecisionAt =
      dto.scheduledDecisionAt !== undefined
        ? this.parseDate(dto.scheduledDecisionAt) ?? null
        : existing.scheduledDecisionAt;

    let status = existing.status;
    if (
      status === GovernanceCycleInstanceStatus.DRAFT &&
      periodLabel &&
      scheduledDecisionAt
    ) {
      status = GovernanceCycleInstanceStatus.PLANNED;
    }
    this.assertPlannedFields(periodLabel, scheduledDecisionAt, status);

    const updated = await this.prisma.governanceCycleInstance.update({
      where: { id: instanceId },
      data: {
        ...(dto.periodLabel !== undefined ? { periodLabel } : {}),
        ...(dto.periodStartDate !== undefined
          ? {
              periodStartDate: dto.periodStartDate
                ? this.parseDateOnly(dto.periodStartDate)
                : null,
            }
          : {}),
        ...(dto.periodEndDate !== undefined
          ? {
              periodEndDate: dto.periodEndDate
                ? this.parseDateOnly(dto.periodEndDate)
                : null,
            }
          : {}),
        ...(dto.label !== undefined ? { label: dto.label?.trim() || null } : {}),
        ...(dto.scheduledDecisionAt !== undefined ? { scheduledDecisionAt } : {}),
        ...(dto.endsAt !== undefined
          ? { endsAt: dto.endsAt ? this.parseDate(dto.endsAt) : null }
          : {}),
        ...(dto.mode !== undefined ? { mode: dto.mode } : {}),
        ...(dto.locationLabel !== undefined
          ? { locationLabel: dto.locationLabel?.trim() || null }
          : {}),
        ...(dto.meetingUrl !== undefined
          ? { meetingUrl: dto.meetingUrl?.trim() || null }
          : {}),
        ...(dto.decisionSummary !== undefined
          ? { decisionSummary: dto.decisionSummary?.trim() || null }
          : {}),
        status,
      },
      include: { agendaItems: true, decisions: true },
    });

    await this.auditInstance(
      clientId,
      context,
      'governance_cycle_instance.updated',
      instanceId,
      { status: existing.status },
      { status: updated.status, periodLabel: updated.periodLabel },
    );

    return this.toInstanceResponse(updated);
  }

  async openInstance(
    clientId: string,
    cycleId: string,
    instanceId: string,
    context?: InstanceAuditContext,
  ): Promise<GovernanceCycleInstanceResponseDto> {
    await this.findCycle(clientId, cycleId);
    const existing = await this.findInstance(clientId, cycleId, instanceId);
    if (existing.status !== GovernanceCycleInstanceStatus.PLANNED) {
      throw new BadRequestException('Only PLANNED instances can be opened');
    }
    this.assertPlannedFields(
      existing.periodLabel,
      existing.scheduledDecisionAt,
      GovernanceCycleInstanceStatus.OPEN,
    );
    if (existing.agendaItems.length === 0) {
      throw new BadRequestException('Cannot open an instance without agenda items');
    }

    const updated = await this.prisma.governanceCycleInstance.update({
      where: { id: instanceId },
      data: {
        status: GovernanceCycleInstanceStatus.OPEN,
        openedAt: new Date(),
      },
      include: { agendaItems: true, decisions: true },
    });

    await this.auditInstance(clientId, context, 'governance_cycle_instance.opened', instanceId);
    return this.toInstanceResponse(updated);
  }

  async archiveInstance(
    clientId: string,
    cycleId: string,
    instanceId: string,
    context?: InstanceAuditContext,
  ): Promise<GovernanceCycleInstanceResponseDto> {
    const existing = await this.findInstance(clientId, cycleId, instanceId);
    if (existing.status !== GovernanceCycleInstanceStatus.CLOSED) {
      throw new BadRequestException('Only CLOSED instances can be archived');
    }
    const updated = await this.prisma.governanceCycleInstance.update({
      where: { id: instanceId },
      data: { status: GovernanceCycleInstanceStatus.ARCHIVED },
      include: { agendaItems: true, decisions: true },
    });
    return this.toInstanceResponse(updated);
  }

  async replaceAgenda(
    clientId: string,
    cycleId: string,
    instanceId: string,
    dto: ReplaceInstanceAgendaDto,
    context?: InstanceAuditContext,
  ): Promise<GovernanceCycleInstanceDetailDto> {
    const instance = await this.findInstance(clientId, cycleId, instanceId);
    if (
      instance.status !== GovernanceCycleInstanceStatus.DRAFT &&
      instance.status !== GovernanceCycleInstanceStatus.PLANNED &&
      instance.status !== GovernanceCycleInstanceStatus.OPEN
    ) {
      throw new ConflictException('Agenda cannot be modified for this instance status');
    }

    const itemIds = dto.items.map((i) => i.itemId);
    const unique = new Set(itemIds);
    if (unique.size !== itemIds.length) {
      throw new BadRequestException('Duplicate itemId in agenda');
    }

    const items = await this.prisma.governanceCycleItem.findMany({
      where: { clientId, cycleId, id: { in: itemIds } },
      select: { id: true },
    });
    if (items.length !== itemIds.length) {
      throw new BadRequestException('One or more items are not in this cycle');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.governanceCycleInstanceAgendaItem.deleteMany({
        where: { instanceId, clientId },
      });
      let order = 0;
      for (const entry of dto.items) {
        await tx.governanceCycleInstanceAgendaItem.create({
          data: {
            clientId,
            instanceId,
            itemId: entry.itemId,
            sortOrder: entry.sortOrder ?? order++,
          },
        });
      }
    });

    await this.auditInstance(clientId, context, 'governance_cycle_instance.agenda_replaced', instanceId, undefined, {
      itemCount: itemIds.length,
    });

    return this.getInstance(clientId, cycleId, instanceId);
  }

  async upsertDecisions(
    clientId: string,
    cycleId: string,
    instanceId: string,
    dto: UpsertInstanceItemDecisionsDto,
    context?: InstanceAuditContext,
  ): Promise<GovernanceCycleInstanceDetailDto> {
    const instance = await this.findInstance(clientId, cycleId, instanceId);
    if (instance.status !== GovernanceCycleInstanceStatus.OPEN) {
      throw new BadRequestException('Decisions can only be updated while instance is OPEN');
    }

    const agendaIds = new Set(instance.agendaItems.map((a) => a.itemId));

    for (const d of dto.decisions) {
      if (!agendaIds.has(d.itemId)) {
        throw new BadRequestException('Decision item must be on the instance agenda');
      }
      if (d.decisionStatus === GovernanceCycleItemDecisionStatus.TO_ARBITRATE) {
        throw new BadRequestException(
          'Use CANDIDATE instead of TO_ARBITRATE for instance decisions',
        );
      }
      if (d.decisionStatus === GovernanceCycleItemDecisionStatus.CANDIDATE) {
        throw new BadRequestException('CANDIDATE is not a final instance decision status');
      }
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      for (const d of dto.decisions) {
        await tx.governanceCycleInstanceDecision.upsert({
          where: {
            instanceId_itemId: { instanceId, itemId: d.itemId },
          },
          create: {
            clientId,
            instanceId,
            itemId: d.itemId,
            decisionStatus: d.decisionStatus,
            decisionReason: d.decisionReason?.trim() || null,
          },
          update: {
            decisionStatus: d.decisionStatus,
            decisionReason: d.decisionReason?.trim() || null,
          },
        });
      }
    });

    await this.auditInstance(
      clientId,
      context,
      'governance_cycle_instance.decision_changed',
      instanceId,
      undefined,
      { count: dto.decisions.length },
    );

    return this.getInstance(clientId, cycleId, instanceId);
  }

  private async loadConfig(
    clientId: string,
    cycleId: string,
    allowBudget: boolean,
  ): Promise<NormalizedGovernanceCycleConfig> {
    const cycle = await this.prisma.governanceCycle.findFirst({
      where: { id: cycleId, clientId },
      select: { governanceConfig: true },
    });
    return governanceConfigFromDb(cycle?.governanceConfig, {
      allowBudgetGovernancePropagation: allowBudget,
    });
  }

  private budgetPropagationEnabled(): boolean {
    return typeof this.prisma.budgetGovernanceDecision?.create === 'function';
  }

  async closeInstance(
    clientId: string,
    cycleId: string,
    instanceId: string,
    context?: InstanceAuditContext,
  ): Promise<GovernanceCycleInstanceDetailDto> {
    const allowBudget = this.budgetPropagationEnabled();
    const config = await this.loadConfig(clientId, cycleId, allowBudget);
    const actorUserId = context?.actorUserId;

    try {
      await this.prisma.$transaction(async (tx) => {
        const instance = await tx.governanceCycleInstance.findFirst({
          where: { id: instanceId, clientId, cycleId },
          include: {
            agendaItems: { include: { item: true } },
            decisions: true,
          },
        });
        if (!instance) throw new NotFoundException('Governance cycle instance not found');
        if (instance.status !== GovernanceCycleInstanceStatus.OPEN) {
          if (instance.status === GovernanceCycleInstanceStatus.CLOSED) {
            throw new ConflictException('Instance is already closed');
          }
          throw new BadRequestException('Only OPEN instances can be closed');
        }
        if (instance.agendaItems.length === 0) {
          throw new BadRequestException('Cannot close an instance with an empty agenda');
        }

        const agendaItemIds = instance.agendaItems.map((a) => a.itemId);
        const decisionByItem = new Map(
          instance.decisions.map((d) => [d.itemId, d]),
        );

        for (const agenda of instance.agendaItems) {
          const item = agenda.item;
          const draft = decisionByItem.get(item.id);
          const status =
            draft?.decisionStatus ?? normalizeItemDecisionStatusForRead(item.decisionStatus);
          if (isItemUndecidedForInstanceClose(status)) {
            throw new BadRequestException(
              'Cannot close while an agenda item remains CANDIDATE',
            );
          }
          if (!isValidInstanceFinalDecision(status)) {
            throw new BadRequestException(
              `Invalid final decision status for item ${item.id}`,
            );
          }
        }

        const closedAt = new Date();
        const finalized: Array<{
          id: string;
          itemId: string;
          sourceType: (typeof instance.agendaItems)[0]['item']['sourceType'];
          projectId: string | null;
          budgetId: string | null;
          decisionStatus: GovernanceCycleItemDecisionStatus;
          decisionReason: string | null;
          decidedAt: Date;
          decidedByUserId: string | null;
        }> = [];

        for (const agenda of instance.agendaItems) {
          const item = agenda.item;
          const draft = decisionByItem.get(item.id);
          const decisionStatus =
            draft?.decisionStatus ??
            normalizeItemDecisionStatusForRead(item.decisionStatus);
          const decisionReason =
            draft?.decisionReason ?? item.decisionReason ?? null;

          const row = await tx.governanceCycleInstanceDecision.upsert({
            where: {
              instanceId_itemId: { instanceId, itemId: item.id },
            },
            create: {
              clientId,
              instanceId,
              itemId: item.id,
              decisionStatus,
              decisionReason,
              decidedAt: closedAt,
              decidedByUserId: actorUserId ?? null,
            },
            update: {
              decisionStatus,
              decisionReason,
              decidedAt: closedAt,
              decidedByUserId: actorUserId ?? null,
            },
          });

          await tx.governanceCycleItem.update({
            where: { id: item.id },
            data: { decisionStatus, decisionReason },
          });

          finalized.push({
            id: row.id,
            itemId: item.id,
            sourceType: item.sourceType,
            projectId: item.projectId,
            budgetId: item.budgetId,
            decisionStatus,
            decisionReason,
            decidedAt: closedAt,
            decidedByUserId: actorUserId ?? null,
          });
        }

        await this.readiness.assertProjectsReadyForClose(
          tx,
          clientId,
          config,
          finalized.map((f) => ({
            itemId: f.itemId,
            sourceType: f.sourceType,
            projectId: f.projectId,
            decisionStatus: f.decisionStatus,
          })),
        );

        await this.propagation.applyInTransaction(
          tx,
          clientId,
          instanceId,
          config,
          finalized,
          context ?? {},
          { allowBudgetGovernancePropagation: allowBudget },
        );

        await tx.governanceCycleInstance.update({
          where: { id: instanceId },
          data: {
            status: GovernanceCycleInstanceStatus.CLOSED,
            closedAt,
            closedByUserId: actorUserId ?? null,
          },
        });
      });
    } catch (e) {
      if (
        e instanceof BadRequestException &&
        (e.getResponse() as { code?: string })?.code === 'GOVERNANCE_CYCLE_PROJECT_NOT_READY'
      ) {
        throw e;
      }
      if (e instanceof ConflictException || e instanceof NotFoundException) {
        throw e;
      }
      if (e instanceof BadRequestException) {
        throw e;
      }
      await this.auditInstance(
        clientId,
        context,
        'governance_cycle_instance.close_failed',
        instanceId,
        undefined,
        { reason: e instanceof Error ? e.message : 'unknown' },
      );
      throw new ConflictException({
        code: 'GOVERNANCE_CYCLE_INSTANCE_CLOSE_PROPAGATION_FAILED',
        message: 'Instance close failed; instance remains OPEN',
      });
    }

    await this.auditInstance(clientId, context, 'governance_cycle_instance.closed', instanceId);
    return this.getInstance(clientId, cycleId, instanceId);
  }

  async generateInstances(
    clientId: string,
    cycleId: string,
    context?: InstanceAuditContext,
  ): Promise<GovernanceCycleInstanceListResponseDto> {
    const allowBudget = this.budgetPropagationEnabled();
    const config = await this.loadConfig(clientId, cycleId, allowBudget);
    const schedule = config.instanceSchedule;
    if (!schedule?.enabled || !schedule.firstDecisionAt) {
      throw new BadRequestException('instanceSchedule is not enabled on this cycle');
    }
    const count = schedule.count ?? 4;
    const stepMonths = schedule.stepMonths ?? 3;
    let cursor = new Date(schedule.firstDecisionAt);
    const created: GovernanceCycleInstanceResponseDto[] = [];

    for (let i = 1; i <= count; i++) {
      const row = await this.prisma.governanceCycleInstance.create({
        data: {
          clientId,
          cycleId,
          periodLabel: buildGeneratedInstancePeriodLabel(i),
          scheduledDecisionAt: new Date(cursor),
          mode: config.defaultInstanceMode ?? 'MEETING',
          status: GovernanceCycleInstanceStatus.PLANNED,
        },
        include: { agendaItems: true, decisions: true },
      });
      created.push(await this.toInstanceResponse(row));
      cursor = new Date(cursor);
      cursor.setMonth(cursor.getMonth() + stepMonths);
    }

    await this.auditInstance(clientId, context, 'governance_cycle_instance.generated', cycleId, undefined, {
      count: created.length,
    });

    return { items: created };
  }

  /** Used by GovernanceCyclesService — item on agenda of OPEN instance. */
  async isItemLockedByOpenInstance(
    clientId: string,
    cycleId: string,
    itemId: string,
  ): Promise<boolean> {
    const link = await this.prisma.governanceCycleInstanceAgendaItem.findFirst({
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
    return Boolean(link);
  }
}
