import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BudgetLineAllocationScope, BudgetLineStatus, BudgetStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../../audit-logs/audit-logs.service';
import { generateBudgetLineCode } from '../helpers/code-generator.helper';
import { toDecimal, fromDecimal } from '../helpers/decimal.helper';
import { AuditContext, ListResult } from '../types/audit-context';
import { CreateBudgetLineDto } from './dto/create-budget-line.dto';
import { ListBudgetLinesQueryDto } from './dto/list-budget-lines.query.dto';
import { UpdateBudgetLineDto } from './dto/update-budget-line.dto';

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
  initialAmount: number;
  revisedAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  generalLedgerAccountId: string | null;
  generalLedgerAccountCode: string;
  generalLedgerAccountName: string;
  analyticalLedgerAccountId: string | null;
  analyticalLedgerAccountCode: string | null;
  analyticalLedgerAccountName: string | null;
  allocationScope: string;
  costCenterSplits: CostCenterSplitResponse[];
  createdAt: Date;
  updatedAt: Date;
}

const BUDGET_LINE_INCLUDE = {
  generalLedgerAccount: { select: { id: true, code: true, name: true } },
  analyticalLedgerAccount: { select: { id: true, code: true, name: true } },
  costCenterSplits: {
    include: { costCenter: { select: { id: true, code: true, name: true } } },
  },
} as const;

@Injectable()
export class BudgetLinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

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

    const [items, total] = await Promise.all([
      this.prisma.budgetLine.findMany({
        where,
        include: BUDGET_LINE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.budgetLine.count({ where }),
    ]);

    return {
      items: items.map(toResponse),
      total,
      limit,
      offset,
    };
  }

  async getById(
    clientId: string,
    id: string,
  ): Promise<BudgetLineResponse> {
    const line = await this.prisma.budgetLine.findFirst({
      where: { id, clientId },
      include: BUDGET_LINE_INCLUDE,
    });
    if (!line) {
      throw new NotFoundException('Budget line not found');
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

    const revisedAmount =
      dto.revisedAmount !== undefined && dto.revisedAmount !== null
        ? dto.revisedAmount
        : dto.initialAmount;
    const forecastAmount = 0;
    const committedAmount = 0;
    const consumedAmount = 0;
    const remainingAmount = revisedAmount;

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
          initialAmount: toDecimal(dto.initialAmount),
          revisedAmount: toDecimal(revisedAmount),
          forecastAmount: toDecimal(forecastAmount),
          committedAmount: toDecimal(committedAmount),
          consumedAmount: toDecimal(consumedAmount),
          remainingAmount: toDecimal(remainingAmount),
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
        initialAmount: dto.initialAmount,
        revisedAmount,
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
    if (
      existing.status === BudgetLineStatus.ARCHIVED ||
      existing.status === BudgetLineStatus.CLOSED
    ) {
      throw new BadRequestException(
        'Cannot update an archived or closed budget line',
      );
    }

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
      const baseData: Prisma.BudgetLineUpdateInput = {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.code != null && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status != null && { status: dto.status }),
        ...(dto.currency != null && { currency: dto.currency }),
        ...(dto.expenseType != null && { expenseType: dto.expenseType }),
        ...(dto.generalLedgerAccountId !== undefined && {
          generalLedgerAccountId: dto.generalLedgerAccountId,
        }),
        ...(dto.analyticalLedgerAccountId !== undefined && {
          analyticalLedgerAccountId: dto.analyticalLedgerAccountId ?? null,
        }),
        ...(dto.allocationScope != null && { allocationScope: dto.allocationScope }),
      };

      if (dto.revisedAmount !== undefined && dto.revisedAmount !== null) {
        const committed = Number(existing.committedAmount);
        const consumed = Number(existing.consumedAmount);
        const remaining = dto.revisedAmount - committed - consumed;
        baseData.revisedAmount = toDecimal(dto.revisedAmount);
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

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'budget_line.updated',
      resourceType: 'budget_line',
      resourceId: updated.id,
      oldValue: {
        name: existing.name,
        code: existing.code,
        status: existing.status,
        generalLedgerAccountId: existing.generalLedgerAccountId,
        analyticalLedgerAccountId: existing.analyticalLedgerAccountId,
        allocationScope: existing.allocationScope,
        revisedAmount: fromDecimal(existing.revisedAmount),
        remainingAmount: fromDecimal(existing.remainingAmount),
        costCenterSplitsSummary: existing.costCenterSplits.map((s) => ({
          costCenterId: s.costCenterId,
          percentage: fromDecimal(s.percentage),
        })),
      },
      newValue: {
        name: updated.name,
        code: updated.code,
        status: updated.status,
        generalLedgerAccountId: updated.generalLedgerAccountId,
        analyticalLedgerAccountId: updated.analyticalLedgerAccountId,
        allocationScope: updated.allocationScope,
        revisedAmount: fromDecimal(updated.revisedAmount),
        remainingAmount: fromDecimal(updated.remainingAmount),
        costCenterSplitsSummary: updated.costCenterSplits.map((s) => ({
          costCenterId: s.costCenterId,
          percentage: fromDecimal(s.percentage),
        })),
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return toResponse(updated);
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
    initialAmount: fromDecimal(row.initialAmount),
    revisedAmount: fromDecimal(row.revisedAmount),
    forecastAmount: fromDecimal(row.forecastAmount),
    committedAmount: fromDecimal(row.committedAmount),
    consumedAmount: fromDecimal(row.consumedAmount),
    remainingAmount: fromDecimal(row.remainingAmount),
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
