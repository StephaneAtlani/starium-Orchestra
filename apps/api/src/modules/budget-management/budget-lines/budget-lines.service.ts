import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BudgetLineAllocationScope, BudgetLineStatus, BudgetStatus, BudgetTaxMode } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../../audit-logs/audit-logs.service';
import { generateBudgetLineCode } from '../helpers/code-generator.helper';
import { toDecimal, fromDecimal } from '../helpers/decimal.helper';
import {
  BulkStatusApplyResult,
  BulkUpdateBudgetLineStatusDto,
} from '../dto/bulk-update-status.dto';
import { bulkStatusFailureMessage } from '../helpers/bulk-status-error.helper';
import { AuditContext, ListResult } from '../types/audit-context';
import { CreateBudgetLineDto } from './dto/create-budget-line.dto';
import { ListBudgetLinesQueryDto } from './dto/list-budget-lines.query.dto';
import { UpdateBudgetLineDto } from './dto/update-budget-line.dto';
import { TaxCalculator } from '../../financial-core/helpers/tax-calculator';
import { assertBudgetLineStatusTransition } from '../policies/budget-line-status-transitions';
import { resolveDeferredExerciseIdForLine } from '../helpers/deferred-exercise.helper';
import {
  entityKeysFromDto,
  newValueWithStatusComment,
  normalizeStatusChangeComment,
} from '../helpers/status-change-comment.helper';
import { AccessControlService } from '../../access-control/access-control.service';
import { RESOURCE_ACL_RESOURCE_TYPES } from '../../access-control/resource-acl.constants';

export interface CostCenterSplitResponse {
  id: string;
  costCenterId: string;
  costCenterCode: string;
  costCenterName: string;
  percentage: number;
}

export interface BudgetLineResponse {
  id: string;
  clientId: string;
  budgetId: string;
  envelopeId: string;
  code: string;
  name: string;
  description: string | null;
  expenseType: string;
  status: string;
  currency: string;
  /**
   * TVA en %.
   * - null => TTC budgétaire indisponible (projection impossible)
   */
  taxRate: number | null;
  initialAmount: number;
  initialTaxAmount: number | null;
  initialAmountTtc: number | null;
  forecastAmount: number;
  forecastTaxAmount: number | null;
  forecastAmountTtc: number | null;
  committedAmount: number;
  committedTaxAmount: number | null;
  committedAmountTtc: number | null;
  consumedAmount: number;
  consumedTaxAmount: number | null;
  consumedAmountTtc: number | null;
  remainingAmount: number;
  remainingTaxAmount: number | null;
  remainingAmountTtc: number | null;
  generalLedgerAccountId: string | null;
  generalLedgerAccountCode: string;
  generalLedgerAccountName: string;
  analyticalLedgerAccountId: string | null;
  analyticalLedgerAccountCode: string | null;
  analyticalLedgerAccountName: string | null;
  allocationScope: string;
  costCenterSplits: CostCenterSplitResponse[];
  deferredToExerciseId: string | null;
  deferredToExerciseName: string | null;
  deferredToExerciseCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const BUDGET_LINE_INCLUDE = {
  generalLedgerAccount: { select: { id: true, code: true, name: true } },
  analyticalLedgerAccount: { select: { id: true, code: true, name: true } },
  deferredToExercise: { select: { id: true, name: true, code: true } },
  costCenterSplits: {
    include: { costCenter: { select: { id: true, code: true, name: true } } },
  },
} as const;

@Injectable()
export class BudgetLinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly accessControl: Pick<
      AccessControlService,
      'canReadResource' | 'canWriteResource' | 'filterReadableResourceIds'
    > = {
      canReadResource: async () => true,
      canWriteResource: async () => true,
      filterReadableResourceIds: async (params) => params.resourceIds,
    },
  ) {}

  private async assertCanReadParentBudget(
    clientId: string,
    userId: string,
    budgetId: string,
  ): Promise<void> {
    const allowed = await this.accessControl.canReadResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.BUDGET,
      resourceId: budgetId,
    });
    if (!allowed) throw new ForbiddenException('Accès refusé par ACL ressource');
  }

  private async assertCanWriteParentBudget(
    clientId: string,
    userId: string,
    budgetId: string,
  ): Promise<void> {
    const allowed = await this.accessControl.canWriteResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.BUDGET,
      resourceId: budgetId,
    });
    if (!allowed) throw new ForbiddenException('Accès refusé par ACL ressource');
  }

  private normalizeGeneralLedgerAccountId(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === '') {
      return null;
    }
    return value;
  }

  private async isBudgetAccountingEnabled(clientId: string): Promise<boolean> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { budgetAccountingEnabled: true },
    });
    return !!client?.budgetAccountingEnabled;
  }

  async list(
    clientId: string,
    query: ListBudgetLinesQueryDto,
    userId?: string,
  ): Promise<ListResult<BudgetLineResponse>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: Prisma.BudgetLineWhereInput = {
      clientId,
      ...(query.budgetId && { budgetId: query.budgetId }),
      ...(query.envelopeId && { envelopeId: query.envelopeId }),
      ...(query.status && { status: query.status }),
      ...(query.expenseType && { expenseType: query.expenseType }),
      ...(query.generalLedgerAccountId && {
        generalLedgerAccountId: query.generalLedgerAccountId,
      }),
      ...(query.allocationScope && { allocationScope: query.allocationScope }),
      ...(query.costCenterId && {
        costCenterSplits: {
          some: { costCenterId: query.costCenterId, clientId },
        },
      }),
    };
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.budgetLine.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, budgetId: true },
    });
    const readableBudgetIds = userId
      ? await this.accessControl.filterReadableResourceIds({
          clientId,
          userId,
          resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.BUDGET,
          resourceIds: Array.from(new Set(rows.map((row) => row.budgetId))),
          operation: 'read',
        })
      : Array.from(new Set(rows.map((row) => row.budgetId)));
    const readableBudgetSet = new Set(readableBudgetIds);
    const readableLineIds = rows
      .filter((row) => readableBudgetSet.has(row.budgetId))
      .map((row) => row.id);
    const total = readableLineIds.length;
    const pagedLineIds = readableLineIds.slice(offset, offset + limit);
    const items =
      pagedLineIds.length === 0
        ? []
        : await this.prisma.budgetLine.findMany({
            where: { clientId, id: { in: pagedLineIds } },
            include: BUDGET_LINE_INCLUDE,
          });
    const byId = new Map(items.map((item) => [item.id, item]));
    const orderedItems: BudgetLineResponse[] = [];
    for (const id of pagedLineIds) {
      const item = byId.get(id);
      if (item) orderedItems.push(toResponse(item));
    }

    return {
      items: orderedItems,
      total,
      limit,
      offset,
    };
  }

  async getById(
    clientId: string,
    id: string,
    userId?: string,
  ): Promise<BudgetLineResponse> {
    const line = await this.prisma.budgetLine.findFirst({
      where: { id, clientId },
      include: BUDGET_LINE_INCLUDE,
    });
    if (!line) {
      throw new NotFoundException('Budget line not found');
    }
    if (userId) {
      await this.assertCanReadParentBudget(clientId, userId, line.budgetId);
    }
    return toResponse(line);
  }

  async create(
    clientId: string,
    dto: CreateBudgetLineDto,
    context?: AuditContext,
  ): Promise<BudgetLineResponse> {
    const normalizedGeneralLedgerAccountId = this.normalizeGeneralLedgerAccountId(
      dto.generalLedgerAccountId ?? undefined,
    );
    dto.generalLedgerAccountId = normalizedGeneralLedgerAccountId;

    const allocationScope = dto.allocationScope ?? BudgetLineAllocationScope.ENTERPRISE;
    const costCenterSplits = dto.costCenterSplits ?? [];

    if (allocationScope === BudgetLineAllocationScope.ENTERPRISE && costCenterSplits.length > 0) {
      throw new BadRequestException(
        'ENTERPRISE allocation scope must have zero cost center splits',
      );
    }
    if (allocationScope === BudgetLineAllocationScope.ANALYTICAL) {
      if (costCenterSplits.length === 0) {
        throw new BadRequestException(
          'ANALYTICAL allocation scope requires at least one cost center split',
        );
      }
      const sum = costCenterSplits.reduce((s, x) => s + x.percentage, 0);
      if (Math.abs(sum - 100) > 0.01) {
        throw new BadRequestException(
          `Sum of cost center split percentages must equal 100 (got ${sum})`,
        );
      }
      const costCenterIds = costCenterSplits.map((s) => s.costCenterId);
      if (new Set(costCenterIds).size !== costCenterIds.length) {
        throw new BadRequestException(
          'Duplicate cost center in splits (each center can appear only once per line)',
        );
      }
    }

    const budgetAccountingEnabled = await this.isBudgetAccountingEnabled(clientId);
    if (budgetAccountingEnabled && !dto.generalLedgerAccountId) {
      throw new BadRequestException('General ledger account is required for this client');
    }

    if (dto.generalLedgerAccountId) {
      await this.validateGeneralLedgerAccount(clientId, dto.generalLedgerAccountId);
    }
    if (dto.analyticalLedgerAccountId) {
      await this.validateAnalyticalLedgerAccount(clientId, dto.analyticalLedgerAccountId);
    }
    for (const s of costCenterSplits) {
      await this.validateCostCenter(clientId, s.costCenterId);
    }

    const budget = await this.prisma.budget.findFirst({
      where: { id: dto.budgetId, clientId },
    });
    if (!budget) {
      throw new NotFoundException(
        'Budget not found or does not belong to this client',
      );
    }
    if (context?.actorUserId) {
      await this.assertCanWriteParentBudget(clientId, context.actorUserId, budget.id);
    }
    if (
      budget.status === BudgetStatus.LOCKED ||
      budget.status === BudgetStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'Cannot create line for a locked or archived budget',
      );
    }
    if (
      budget.isVersioned &&
      budget.versionStatus &&
      ['SUPERSEDED', 'ARCHIVED'].includes(budget.versionStatus)
    ) {
      throw new BadRequestException(
        'Cannot create line for a superseded or archived version',
      );
    }

    const envelope = await this.prisma.budgetEnvelope.findFirst({
      where: { id: dto.envelopeId, clientId },
    });
    if (!envelope) {
      throw new NotFoundException(
        'Envelope not found or does not belong to this client',
      );
    }
    if (envelope.budgetId !== dto.budgetId) {
      throw new BadRequestException(
        'Envelope must belong to the specified budget',
      );
    }

    const forecastAmount = 0;
    const committedAmount = 0;
    const consumedAmount = 0;

    const clientTax = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { defaultTaxRate: true },
    });

    // Hiérarchie des taux (TTC budgété / conversion) :
    // BudgetLine.taxRate > Budget.defaultTaxRate > Client.defaultTaxRate
    const taxRateToPersist =
      dto.taxRate !== undefined
        ? toDecimal(dto.taxRate)
        : budget.defaultTaxRate ?? clientTax?.defaultTaxRate ?? null;

    // Normalisation interne : stocker en HT.
    let initialAmountStored = toDecimal(dto.initialAmount);

    if (budget.taxMode === BudgetTaxMode.TTC) {
      if (taxRateToPersist == null) {
        throw new BadRequestException(
          'Budget en mode TTC : tax rate requis (BudgetLine.taxRate ou Budget.defaultTaxRate ou Client.defaultTaxRate).',
        );
      }
      initialAmountStored = TaxCalculator.fromTtcAndTaxRate({
        amountTtc: initialAmountStored,
        taxRate: taxRateToPersist,
      }).amountHt;
    }

    const remainingAmountStored = initialAmountStored;

    let code = dto.code?.trim();
    if (!code) {
      code = await this.resolveUniqueBudgetLineCode(clientId, dto.budgetId);
    } else {
      const existing = await this.prisma.budgetLine.findUnique({
        where: {
          clientId_budgetId_code: {
            clientId,
            budgetId: dto.budgetId,
            code,
          },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Budget line with code "${code}" already exists in this budget`,
        );
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const line = await tx.budgetLine.create({
        data: {
          clientId,
          budgetId: dto.budgetId,
          envelopeId: dto.envelopeId,
          name: dto.name,
          code,
          description: dto.description ?? null,
          expenseType: dto.expenseType,
          status: dto.status ?? BudgetLineStatus.DRAFT,
          currency: dto.currency,
          generalLedgerAccountId: dto.generalLedgerAccountId,
          analyticalLedgerAccountId: dto.analyticalLedgerAccountId ?? null,
          allocationScope,
          initialAmount: initialAmountStored,
          forecastAmount: toDecimal(forecastAmount),
          committedAmount: toDecimal(committedAmount),
          consumedAmount: toDecimal(consumedAmount),
          remainingAmount: remainingAmountStored,
          taxRate: taxRateToPersist,
        },
      });
      if (allocationScope === BudgetLineAllocationScope.ANALYTICAL && costCenterSplits.length > 0) {
        for (const s of costCenterSplits) {
          await tx.budgetLineCostCenterSplit.create({
            data: {
              clientId,
              budgetLineId: line.id,
              costCenterId: s.costCenterId,
              percentage: toDecimal(s.percentage),
            },
          });
        }
      }
      return tx.budgetLine.findUniqueOrThrow({
        where: { id: line.id },
        include: BUDGET_LINE_INCLUDE,
      });
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'budget_line.created',
      resourceType: 'budget_line',
      resourceId: created!.id,
      newValue: {
        id: created!.id,
        name: created!.name,
        code: created!.code,
        budgetId: created!.budgetId,
        envelopeId: created!.envelopeId,
        generalLedgerAccountId: created!.generalLedgerAccountId,
        analyticalLedgerAccountId: created!.analyticalLedgerAccountId,
        allocationScope: created!.allocationScope,
        initialAmount: fromDecimal(initialAmountStored),
        currency: created!.currency,
        status: created!.status,
        costCenterSplitsSummary: costCenterSplits.map((s) => ({
          costCenterId: s.costCenterId,
          percentage: s.percentage,
        })),
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return toResponse(created!);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateBudgetLineDto,
    context?: AuditContext,
  ): Promise<BudgetLineResponse> {
    const existing = await this.prisma.budgetLine.findFirst({
      where: { id, clientId },
      include: { budget: true, costCenterSplits: true },
    });
    if (!existing) {
      throw new NotFoundException('Budget line not found');
    }
    if (context?.actorUserId) {
      await this.assertCanWriteParentBudget(
        clientId,
        context.actorUserId,
        existing.budgetId,
      );
    }
    if (
      existing.budget.status === BudgetStatus.LOCKED ||
      existing.budget.status === BudgetStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'Cannot update line when parent budget is locked or archived',
      );
    }
    if (
      existing.budget.isVersioned &&
      existing.budget.versionStatus &&
      ['SUPERSEDED', 'ARCHIVED'].includes(existing.budget.versionStatus)
    ) {
      throw new BadRequestException(
        'Cannot update line when parent budget is a superseded or archived version',
      );
    }
    if (existing.status === BudgetLineStatus.ARCHIVED) {
      throw new BadRequestException('Cannot update an archived budget line');
    }
    if (existing.status === BudgetLineStatus.CLOSED) {
      const dtoKeys = Object.keys(dto).filter(
        (k) => (dto as Record<string, unknown>)[k] !== undefined,
      );
      const onlyArchiving =
        dtoKeys.length === 1 &&
        dtoKeys[0] === 'status' &&
        dto.status === BudgetLineStatus.ARCHIVED;
      if (!onlyArchiving) {
        throw new BadRequestException(
          'Closed budget line can only transition to ARCHIVED',
        );
      }
    }

    if (dto.status != null && dto.status !== existing.status) {
      assertBudgetLineStatusTransition(existing.status, dto.status);
    }

    const resolvedDeferredToExerciseId = await resolveDeferredExerciseIdForLine(
      this.prisma,
      clientId,
      dto,
      {
        status: existing.status,
        deferredToExerciseId: existing.deferredToExerciseId ?? null,
      },
    );

    const allocationScope = dto.allocationScope ?? existing.allocationScope;
    const costCenterSplits = dto.costCenterSplits;

    if (allocationScope === BudgetLineAllocationScope.ENTERPRISE) {
      if (costCenterSplits !== undefined && costCenterSplits.length > 0) {
        throw new BadRequestException(
          'ENTERPRISE allocation scope must have zero cost center splits',
        );
      }
    }
    if (allocationScope === BudgetLineAllocationScope.ANALYTICAL && costCenterSplits !== undefined) {
      if (costCenterSplits.length === 0) {
        throw new BadRequestException(
          'ANALYTICAL allocation scope requires at least one cost center split',
        );
      }
      const sum = costCenterSplits.reduce((s, x) => s + x.percentage, 0);
      if (Math.abs(sum - 100) > 0.01) {
        throw new BadRequestException(
          `Sum of cost center split percentages must equal 100 (got ${sum})`,
        );
      }
      const costCenterIds = costCenterSplits.map((s) => s.costCenterId);
      if (new Set(costCenterIds).size !== costCenterIds.length) {
        throw new BadRequestException(
          'Duplicate cost center in splits (each center can appear only once per line)',
        );
      }
    }

    const normalizedGeneralLedgerAccountId = this.normalizeGeneralLedgerAccountId(
      dto.generalLedgerAccountId,
    );
    dto.generalLedgerAccountId = normalizedGeneralLedgerAccountId;

    const budgetAccountingEnabled = await this.isBudgetAccountingEnabled(clientId);

    if (dto.analyticalLedgerAccountId !== undefined && dto.analyticalLedgerAccountId) {
      await this.validateAnalyticalLedgerAccount(clientId, dto.analyticalLedgerAccountId);
    }
    if (dto.generalLedgerAccountId !== undefined) {
      if (dto.generalLedgerAccountId === null) {
        if (budgetAccountingEnabled) {
          throw new BadRequestException(
            'General ledger account cannot be removed for this client',
          );
        }
      } else {
        await this.validateGeneralLedgerAccount(clientId, dto.generalLedgerAccountId);
      }
    }

    if (costCenterSplits) {
      for (const s of costCenterSplits) {
        await this.validateCostCenter(clientId, s.costCenterId);
      }
    }

    if (
      dto.code != null &&
      dto.code !== existing.code
    ) {
      const conflict = await this.prisma.budgetLine.findUnique({
        where: {
          clientId_budgetId_code: {
            clientId,
            budgetId: existing.budgetId,
            code: dto.code,
          },
        },
      });
      if (conflict) {
        throw new ConflictException(
          `Budget line with code "${dto.code}" already exists in this budget`,
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const baseData: Prisma.BudgetLineUncheckedUpdateInput = {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.code != null && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status != null && { status: dto.status }),
        deferredToExerciseId: resolvedDeferredToExerciseId,
        ...(dto.currency != null && { currency: dto.currency }),
        ...(dto.expenseType != null && { expenseType: dto.expenseType }),
        ...(dto.generalLedgerAccountId !== undefined && {
          generalLedgerAccountId: dto.generalLedgerAccountId,
        }),
        ...(dto.analyticalLedgerAccountId !== undefined && {
          analyticalLedgerAccountId: dto.analyticalLedgerAccountId ?? null,
        }),
        ...(dto.allocationScope != null && { allocationScope: dto.allocationScope }),
        ...(dto.taxRate !== undefined && { taxRate: toDecimal(dto.taxRate) }),
      };

      if (dto.initialAmount !== undefined && dto.initialAmount !== null) {
        const committed = Number(existing.committedAmount);
        const consumed = Number(existing.consumedAmount);

        let budgetAmountStoredHt: Prisma.Decimal;
        if (existing.budget.taxMode === BudgetTaxMode.TTC) {
          const effectiveTaxRate =
            dto.taxRate !== undefined
              ? toDecimal(dto.taxRate)
              : existing.taxRate ??
                existing.budget.defaultTaxRate ??
                (
                  await tx.client.findUnique({
                    where: { id: clientId },
                    select: { defaultTaxRate: true },
                  })
                )?.defaultTaxRate ??
                null;

          if (effectiveTaxRate == null) {
            throw new BadRequestException(
              'Budget en mode TTC : tax rate requis (BudgetLine.taxRate ou Budget.defaultTaxRate ou Client.defaultTaxRate).',
            );
          }

          if (dto.taxRate === undefined && existing.taxRate == null) {
            // Permet de mémoriser le taux utilisé pour convertir l’entrée TTC -> HT.
            baseData.taxRate = effectiveTaxRate;
          }

          budgetAmountStoredHt = TaxCalculator.fromTtcAndTaxRate({
            amountTtc: toDecimal(dto.initialAmount),
            taxRate: effectiveTaxRate,
          }).amountHt;
        } else {
          budgetAmountStoredHt = toDecimal(dto.initialAmount);
        }

        const remaining = Number(budgetAmountStoredHt) - committed - consumed;
        baseData.initialAmount = budgetAmountStoredHt;
        baseData.remainingAmount = toDecimal(Math.max(0, remaining));
      }

      if (allocationScope === BudgetLineAllocationScope.ENTERPRISE) {
        await tx.budgetLineCostCenterSplit.deleteMany({
          where: { budgetLineId: id, clientId },
        });
      } else if (
        allocationScope === BudgetLineAllocationScope.ANALYTICAL &&
        costCenterSplits !== undefined
      ) {
        await tx.budgetLineCostCenterSplit.deleteMany({
          where: { budgetLineId: id, clientId },
        });
        for (const s of costCenterSplits) {
          await tx.budgetLineCostCenterSplit.create({
            data: {
              clientId,
              budgetLineId: id,
              costCenterId: s.costCenterId,
              percentage: toDecimal(s.percentage),
            },
          });
        }
      }
      await tx.budgetLine.update({
        where: { id },
        data: baseData,
      });
      return tx.budgetLine.findUniqueOrThrow({
        where: { id },
        include: BUDGET_LINE_INCLUDE,
      });
    });

    // RFC-032 §4.1.5 — audits sémantiques + `budget_line.updated` sans duplication des deltas.
    const keysInDto = entityKeysFromDto(dto as Record<string, unknown>);
    const statusComment = normalizeStatusChangeComment(dto.statusChangeComment);
    const statusChanged =
      dto.status !== undefined && existing.status !== updated.status;
    const onlyStatusInDto =
      keysInDto.length === 1 && keysInDto[0] === 'status';

    const deferredExerciseChanged =
      (existing.deferredToExerciseId ?? null) !==
      (updated.deferredToExerciseId ?? null);

    const onlyDeferredInDto =
      keysInDto.length === 1 && keysInDto[0] === 'deferredToExerciseId';

    const budgetAmountIntent =
      dto.initialAmount !== undefined &&
      fromDecimal(existing.initialAmount) !== fromDecimal(updated.initialAmount);

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    if (onlyStatusInDto && !statusChanged) {
      return toResponse(updated);
    }

    if (onlyDeferredInDto && !deferredExerciseChanged) {
      return toResponse(updated);
    }

    if (onlyStatusInDto && statusChanged) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'budget_line.status.changed',
        resourceType: 'budget_line',
        resourceId: updated.id,
        oldValue: { from: existing.status },
        newValue: newValueWithStatusComment(updated.status, statusComment),
        ...meta,
      });
      return toResponse(updated);
    }

    if (onlyDeferredInDto && deferredExerciseChanged) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'budget_line.deferred',
        resourceType: 'budget_line',
        resourceId: updated.id,
        oldValue: {
          deferredToExerciseId: existing.deferredToExerciseId ?? null,
        },
        newValue: {
          deferredToExerciseId: updated.deferredToExerciseId ?? null,
        },
        ...meta,
      });
      return toResponse(updated);
    }

    if (statusChanged) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'budget_line.status.changed',
        resourceType: 'budget_line',
        resourceId: updated.id,
        oldValue: { from: existing.status },
        newValue: newValueWithStatusComment(updated.status, statusComment),
        ...meta,
      });
    }

    if (deferredExerciseChanged) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'budget_line.deferred',
        resourceType: 'budget_line',
        resourceId: updated.id,
        oldValue: {
          deferredToExerciseId: existing.deferredToExerciseId ?? null,
        },
        newValue: {
          deferredToExerciseId: updated.deferredToExerciseId ?? null,
        },
        ...meta,
      });
    }

    if (budgetAmountIntent) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'budget_line.amounts.updated',
        resourceType: 'budget_line',
        resourceId: updated.id,
        oldValue: { initialAmount: fromDecimal(existing.initialAmount) },
        newValue: { initialAmount: fromDecimal(updated.initialAmount) },
        ...meta,
      });
    }

    const baseOld: Record<string, unknown> = {
      name: existing.name,
      code: existing.code,
      status: existing.status,
      deferredToExerciseId: existing.deferredToExerciseId ?? null,
      generalLedgerAccountId: existing.generalLedgerAccountId,
      analyticalLedgerAccountId: existing.analyticalLedgerAccountId,
      allocationScope: existing.allocationScope,
      initialAmount: fromDecimal(existing.initialAmount),
      remainingAmount: fromDecimal(existing.remainingAmount),
      costCenterSplitsSummary: existing.costCenterSplits.map((s) => ({
        costCenterId: s.costCenterId,
        percentage: fromDecimal(s.percentage),
      })),
    };
    const baseNew: Record<string, unknown> = {
      name: updated.name,
      code: updated.code,
      status: updated.status,
      deferredToExerciseId: updated.deferredToExerciseId ?? null,
      generalLedgerAccountId: updated.generalLedgerAccountId,
      analyticalLedgerAccountId: updated.analyticalLedgerAccountId,
      allocationScope: updated.allocationScope,
      initialAmount: fromDecimal(updated.initialAmount),
      remainingAmount: fromDecimal(updated.remainingAmount),
      costCenterSplitsSummary: updated.costCenterSplits.map((s) => ({
        costCenterId: s.costCenterId,
        percentage: fromDecimal(s.percentage),
      })),
    };

    if (statusChanged) {
      delete baseOld.status;
      delete baseNew.status;
    }
    if (deferredExerciseChanged) {
      delete baseOld.deferredToExerciseId;
      delete baseNew.deferredToExerciseId;
    }
    if (budgetAmountIntent) {
      delete baseOld.initialAmount;
      delete baseNew.initialAmount;
      delete baseOld.remainingAmount;
      delete baseNew.remainingAmount;
    }

    const hasUpdatedPayload = Object.keys(baseOld).length > 0;

    if (hasUpdatedPayload) {
      const auditInput: CreateAuditLogInput = {
        clientId,
        userId: context?.actorUserId,
        action: 'budget_line.updated',
        resourceType: 'budget_line',
        resourceId: updated.id,
        oldValue: baseOld,
        newValue: baseNew,
        ...meta,
      };
      await this.auditLogs.create(auditInput);
    }

    return toResponse(updated);
  }

  /**
   * Transition de statut au sein d’une transaction Prisma (cascade workflow budget).
   * Retourne une entrée d’audit à persister après commit, ou null si aucun changement.
   */
  async applyWorkflowCascadeStatusTransition(
    clientId: string,
    lineId: string,
    toStatus: BudgetLineStatus,
    tx: Prisma.TransactionClient,
  ): Promise<CreateAuditLogInput | null> {
    const existing = await tx.budgetLine.findFirst({
      where: { id: lineId, clientId },
      include: { budget: true, costCenterSplits: true },
    });
    if (!existing) {
      throw new NotFoundException('Budget line not found');
    }
    if (
      existing.budget.status === BudgetStatus.LOCKED ||
      existing.budget.status === BudgetStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'Cannot update line when parent budget is locked or archived',
      );
    }
    if (
      existing.budget.isVersioned &&
      existing.budget.versionStatus &&
      ['SUPERSEDED', 'ARCHIVED'].includes(existing.budget.versionStatus)
    ) {
      throw new BadRequestException(
        'Cannot update line when parent budget is a superseded or archived version',
      );
    }
    if (existing.status === BudgetLineStatus.ARCHIVED) {
      throw new BadRequestException('Cannot update an archived budget line');
    }
    if (existing.status === BudgetLineStatus.CLOSED) {
      throw new BadRequestException('Cannot transition a closed line in workflow cascade');
    }

    if (existing.status === toStatus) {
      return null;
    }

    assertBudgetLineStatusTransition(existing.status, toStatus);

    const resolvedDeferredToExerciseId = await resolveDeferredExerciseIdForLine(
      this.prisma,
      clientId,
      { status: toStatus },
      {
        status: existing.status,
        deferredToExerciseId: existing.deferredToExerciseId ?? null,
      },
    );

    const updated = await tx.budgetLine.update({
      where: { id: lineId },
      data: {
        status: toStatus,
        deferredToExerciseId: resolvedDeferredToExerciseId,
      },
    });

    return {
      clientId,
      userId: undefined,
      action: 'budget_line.status.changed',
      resourceType: 'budget_line',
      resourceId: updated.id,
      oldValue: { from: existing.status },
      newValue: newValueWithStatusComment(
        updated.status,
        normalizeStatusChangeComment(undefined),
      ),
    };
  }

  async bulkUpdateStatus(
    clientId: string,
    dto: BulkUpdateBudgetLineStatusDto,
    context?: AuditContext,
  ): Promise<BulkStatusApplyResult> {
    if (
      dto.status === BudgetLineStatus.DEFERRED &&
      (dto.deferredToExerciseId == null || String(dto.deferredToExerciseId).trim() === '')
    ) {
      throw new BadRequestException(
        'deferredToExerciseId is required when status is DEFERRED',
      );
    }
    if (
      dto.status !== BudgetLineStatus.DEFERRED &&
      dto.deferredToExerciseId != null &&
      dto.deferredToExerciseId !== ''
    ) {
      throw new BadRequestException(
        'deferredToExerciseId must be absent or null when status is not DEFERRED',
      );
    }

    const uniqueIds = [...new Set(dto.ids)];
    const updatedIds: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of uniqueIds) {
      try {
        await this.update(clientId, id, {
          status: dto.status,
          ...(dto.status === BudgetLineStatus.DEFERRED
            ? { deferredToExerciseId: dto.deferredToExerciseId! }
            : {}),
          ...(dto.statusChangeComment !== undefined
            ? { statusChangeComment: dto.statusChangeComment }
            : {}),
        }, context);
        updatedIds.push(id);
      } catch (e) {
        failed.push({ id, error: bulkStatusFailureMessage(e) });
      }
    }

    return {
      status: dto.status,
      updatedIds,
      failed,
    };
  }

  private async validateGeneralLedgerAccount(
    clientId: string,
    generalLedgerAccountId: string,
  ): Promise<void> {
    const gla = await this.prisma.generalLedgerAccount.findFirst({
      where: { id: generalLedgerAccountId, clientId },
    });
    if (!gla) {
      throw new BadRequestException(
        'General ledger account not found or does not belong to this client',
      );
    }
  }

  private async validateAnalyticalLedgerAccount(
    clientId: string,
    analyticalLedgerAccountId: string,
  ): Promise<void> {
    const ala = await this.prisma.analyticalLedgerAccount.findFirst({
      where: { id: analyticalLedgerAccountId, clientId },
    });
    if (!ala) {
      throw new BadRequestException(
        'Analytical ledger account not found or does not belong to this client',
      );
    }
  }

  private async validateCostCenter(
    clientId: string,
    costCenterId: string,
  ): Promise<void> {
    const cc = await this.prisma.costCenter.findFirst({
      where: { id: costCenterId, clientId },
    });
    if (!cc) {
      throw new BadRequestException(
        'Cost center not found or does not belong to this client',
      );
    }
  }

  private async resolveUniqueBudgetLineCode(
    clientId: string,
    budgetId: string,
  ): Promise<string> {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const code = generateBudgetLineCode();
      const existing = await this.prisma.budgetLine.findUnique({
        where: {
          clientId_budgetId_code: { clientId, budgetId, code },
        },
      });
      if (!existing) return code;
    }
    throw new ConflictException(
      'Could not generate unique code for budget line',
    );
  }
}

type BudgetLineRowWithAnalytics = Prisma.BudgetLineGetPayload<{
  include: typeof BUDGET_LINE_INCLUDE;
}>;

function toResponse(row: BudgetLineRowWithAnalytics): BudgetLineResponse {
  const taxRateDec = row.taxRate ?? null;
  const taxRate = taxRateDec != null ? fromDecimal(taxRateDec) : null;

  let initialTaxAmount: number | null = null;
  let initialAmountTtc: number | null = null;
  let forecastTaxAmount: number | null = null;
  let forecastAmountTtc: number | null = null;
  let committedTaxAmount: number | null = null;
  let committedAmountTtc: number | null = null;
  let consumedTaxAmount: number | null = null;
  let consumedAmountTtc: number | null = null;
  let remainingTaxAmount: number | null = null;
  let remainingAmountTtc: number | null = null;

  if (taxRateDec != null) {
    const calcInitial = TaxCalculator.fromHtAndTaxRate({
      amountHt: row.initialAmount,
      taxRate: taxRateDec,
    });
    initialTaxAmount = fromDecimal(calcInitial.taxAmount);
    initialAmountTtc = fromDecimal(calcInitial.amountTtc);

    const calcForecast = TaxCalculator.fromHtAndTaxRate({
      amountHt: row.forecastAmount,
      taxRate: taxRateDec,
    });
    forecastTaxAmount = fromDecimal(calcForecast.taxAmount);
    forecastAmountTtc = fromDecimal(calcForecast.amountTtc);

    const calcCommitted = TaxCalculator.fromHtAndTaxRate({
      amountHt: row.committedAmount,
      taxRate: taxRateDec,
    });
    committedTaxAmount = fromDecimal(calcCommitted.taxAmount);
    committedAmountTtc = fromDecimal(calcCommitted.amountTtc);

    const calcConsumed = TaxCalculator.fromHtAndTaxRate({
      amountHt: row.consumedAmount,
      taxRate: taxRateDec,
    });
    consumedTaxAmount = fromDecimal(calcConsumed.taxAmount);
    consumedAmountTtc = fromDecimal(calcConsumed.amountTtc);

    const calcRemaining = TaxCalculator.fromHtAndTaxRate({
      amountHt: row.remainingAmount,
      taxRate: taxRateDec,
    });
    remainingTaxAmount = fromDecimal(calcRemaining.taxAmount);
    remainingAmountTtc = fromDecimal(calcRemaining.amountTtc);
  }

  return {
    id: row.id,
    clientId: row.clientId,
    budgetId: row.budgetId,
    envelopeId: row.envelopeId,
    code: row.code,
    name: row.name,
    description: row.description,
    expenseType: row.expenseType,
    status: row.status,
    currency: row.currency,
    taxRate,
    initialAmount: fromDecimal(row.initialAmount),
    initialTaxAmount,
    initialAmountTtc,
    forecastAmount: fromDecimal(row.forecastAmount),
    forecastTaxAmount,
    forecastAmountTtc,
    committedAmount: fromDecimal(row.committedAmount),
    committedTaxAmount,
    committedAmountTtc,
    consumedAmount: fromDecimal(row.consumedAmount),
    consumedTaxAmount,
    consumedAmountTtc,
    remainingAmount: fromDecimal(row.remainingAmount),
    remainingTaxAmount,
    remainingAmountTtc,
    generalLedgerAccountId: row.generalLedgerAccountId ?? null,
    generalLedgerAccountCode: row.generalLedgerAccount?.code ?? '',
    generalLedgerAccountName: row.generalLedgerAccount?.name ?? '',
    analyticalLedgerAccountId: row.analyticalLedgerAccountId,
    analyticalLedgerAccountCode: row.analyticalLedgerAccount?.code ?? null,
    analyticalLedgerAccountName: row.analyticalLedgerAccount?.name ?? null,
    allocationScope: row.allocationScope,
    costCenterSplits: (row.costCenterSplits ?? []).map((s) => ({
      id: s.id,
      costCenterId: s.costCenterId,
      costCenterCode: s.costCenter?.code ?? '',
      costCenterName: s.costCenter?.name ?? '',
      percentage: fromDecimal(s.percentage),
    })),
    deferredToExerciseId: row.deferredToExerciseId ?? null,
    deferredToExerciseName: row.deferredToExercise?.name ?? null,
    deferredToExerciseCode: row.deferredToExercise?.code ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
