import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BudgetStatus,
  FinancialEventType,
  FinancialSourceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { BudgetLineCalculatorService } from '../financial-core/budget-line-calculator.service';
import { CreateReallocationDto } from './dto/create-reallocation.dto';
import { ListReallocationQueryDto } from './dto/list-reallocation.query.dto';
import {
  BudgetReallocationListItem,
  BudgetReallocationResponse,
  CreateReallocationContext,
  ListReallocationsResult,
} from './types/budget-reallocation.types';

function toResponse(row: {
  id: string;
  budgetId: string;
  sourceLineId: string;
  targetLineId: string;
  amount: Prisma.Decimal;
  currency: string;
  reason: string | null;
  createdAt: Date;
}): BudgetReallocationResponse {
  return {
    id: row.id,
    budgetId: row.budgetId,
    sourceLineId: row.sourceLineId,
    targetLineId: row.targetLineId,
    amount: Number(row.amount),
    currency: row.currency,
    reason: row.reason,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class BudgetReallocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: BudgetLineCalculatorService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(
    clientId: string,
    dto: CreateReallocationDto,
    context?: CreateReallocationContext,
  ): Promise<BudgetReallocationResponse> {
    if (dto.sourceLineId === dto.targetLineId) {
      throw new BadRequestException(
        'Source and target line must be different',
      );
    }

    const [sourceLine, targetLine] = await Promise.all([
      this.prisma.budgetLine.findFirst({
        where: { id: dto.sourceLineId, clientId },
        include: { budget: true },
      }),
      this.prisma.budgetLine.findFirst({
        where: { id: dto.targetLineId, clientId },
        include: { budget: true },
      }),
    ]);

    if (!sourceLine) {
      throw new NotFoundException(
        'Source budget line not found or does not belong to client',
      );
    }
    if (!targetLine) {
      throw new NotFoundException(
        'Target budget line not found or does not belong to client',
      );
    }

    if (sourceLine.budgetId !== targetLine.budgetId) {
      throw new BadRequestException(
        'Source and target must belong to the same budget',
      );
    }
    if (sourceLine.currency !== targetLine.currency) {
      throw new BadRequestException(
        'Source and target must have the same currency',
      );
    }
    if (
      sourceLine.budget.status === BudgetStatus.LOCKED ||
      sourceLine.budget.status === BudgetStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'Cannot reallocate on a locked or archived budget',
      );
    }

    const remaining = Number(sourceLine.remainingAmount);
    if (dto.amount > remaining) {
      throw new BadRequestException(
        `Amount exceeds source remaining (${remaining})`,
      );
    }

    const now = new Date();
    const currency = sourceLine.currency;
    const budgetId = sourceLine.budgetId;
    const reasonNormalized =
      dto.reason != null && dto.reason.trim() !== ''
        ? dto.reason.trim()
        : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const reallocation = await tx.budgetReallocation.create({
        data: {
          clientId,
          budgetId,
          sourceLineId: dto.sourceLineId,
          targetLineId: dto.targetLineId,
          amount: new Prisma.Decimal(dto.amount),
          currency,
          reason: reasonNormalized,
          createdById: context?.actorUserId ?? null,
        },
      });

      const label = 'Budget reallocation';
      const desc = reasonNormalized ?? `Reallocation ${reallocation.id}`;

      await tx.financialEvent.create({
        data: {
          clientId,
          budgetLineId: dto.sourceLineId,
          sourceType: FinancialSourceType.MANUAL,
          sourceId: reallocation.id,
          eventType: FinancialEventType.REALLOCATION_DONE,
          amountHt: new Prisma.Decimal(-dto.amount),
          taxRate: null,
          taxAmount: null,
          amountTtc: null,
          // Legacy : amount = amountHt
          amount: new Prisma.Decimal(-dto.amount),
          currency,
          eventDate: now,
          label,
          description: desc,
        },
      });
      await tx.financialEvent.create({
        data: {
          clientId,
          budgetLineId: dto.targetLineId,
          sourceType: FinancialSourceType.MANUAL,
          sourceId: reallocation.id,
          eventType: FinancialEventType.REALLOCATION_DONE,
          amountHt: new Prisma.Decimal(dto.amount),
          taxRate: null,
          taxAmount: null,
          amountTtc: null,
          // Legacy : amount = amountHt
          amount: new Prisma.Decimal(dto.amount),
          currency,
          eventDate: now,
          label,
          description: desc,
        },
      });

      const txClient = tx as Parameters<
        BudgetLineCalculatorService['recalculateForBudgetLine']
      >[2];
      await this.calculator.recalculateForBudgetLine(
        dto.sourceLineId,
        clientId,
        txClient,
      );
      await this.calculator.recalculateForBudgetLine(
        dto.targetLineId,
        clientId,
        txClient,
      );

      return reallocation;
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'budget.reallocated',
      resourceType: 'budget_reallocation',
      resourceId: created.id,
      newValue: {
        budgetId: created.budgetId,
        sourceLineId: created.sourceLineId,
        targetLineId: created.targetLineId,
        amount: Number(created.amount),
        currency: created.currency,
        reason: created.reason,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return toResponse(created);
  }

  async list(
    clientId: string,
    query: ListReallocationQueryDto,
  ): Promise<ListReallocationsResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    if (
      query.dateFrom != null &&
      query.dateTo != null &&
      query.dateFrom > query.dateTo
    ) {
      throw new BadRequestException('dateFrom must be less than or equal to dateTo');
    }

    const where: Prisma.BudgetReallocationWhereInput = {
      clientId,
      ...(query.budgetId && { budgetId: query.budgetId }),
      ...(query.budgetLineId && {
        OR: [
          { sourceLineId: query.budgetLineId },
          { targetLineId: query.budgetLineId },
        ],
      }),
      ...(query.dateFrom ||
      query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom && { gte: query.dateFrom }),
              ...(query.dateTo && { lte: query.dateTo }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.budgetReallocation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.budgetReallocation.count({ where }),
    ]);

    return {
      items: items.map((row) => toResponse(row) as BudgetReallocationListItem),
      total,
      limit,
      offset,
    };
  }

  async getById(
    clientId: string,
    id: string,
  ): Promise<BudgetReallocationResponse> {
    const row = await this.prisma.budgetReallocation.findFirst({
      where: { id, clientId },
    });
    if (!row) {
      throw new NotFoundException('Budget reallocation not found');
    }
    return toResponse(row);
  }
}
