import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../../audit-logs/audit-logs.service';
import { BudgetLineCalculatorService } from '../budget-line-calculator.service';
import { assertBudgetLineExistsForClient } from '../helpers/budget-line.helper';
import { CreateFinancialAllocationDto } from './dto/create-financial-allocation.dto';
import { ListFinancialAllocationsQueryDto } from './dto/list-financial-allocations.query.dto';
import { FinancialSourceType } from '@prisma/client';

export interface ListAllocationsResult {
  items: Awaited<
    ReturnType<PrismaService['financialAllocation']['findMany']>
  >;
  total: number;
  limit: number;
  offset: number;
}

export interface CreateAllocationContext {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
}

@Injectable()
export class FinancialAllocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: BudgetLineCalculatorService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(
    clientId: string,
    dto: CreateFinancialAllocationDto,
    context?: CreateAllocationContext,
  ) {
    await assertBudgetLineExistsForClient(
      this.prisma,
      dto.budgetLineId,
      clientId,
    );

    const sourceId =
      dto.sourceType === FinancialSourceType.MANUAL
        ? dto.sourceId ?? ''
        : dto.sourceId!;

    const created = await this.prisma.$transaction(async (tx) => {
      const allocation = await tx.financialAllocation.create({
        data: {
          clientId,
          budgetLineId: dto.budgetLineId,
          sourceType: dto.sourceType,
          sourceId,
          allocationType: dto.allocationType,
          allocatedAmount: dto.allocatedAmount,
          currency: dto.currency,
          effectiveDate: dto.effectiveDate ?? null,
          notes: dto.notes ?? null,
        },
      });
      await this.calculator.recalculateForBudgetLine(
        dto.budgetLineId,
        clientId,
        tx as Parameters<BudgetLineCalculatorService['recalculateForBudgetLine']>[2],
      );
      return allocation;
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'financial_allocation.created',
      resourceType: 'financial_allocation',
      resourceId: created.id,
      newValue: {
        budgetLineId: created.budgetLineId,
        sourceType: created.sourceType,
        allocationType: created.allocationType,
        allocatedAmount: Number(created.allocatedAmount),
        currency: created.currency,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return created;
  }

  async list(
    clientId: string,
    query: ListFinancialAllocationsQueryDto,
  ): Promise<ListAllocationsResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where = {
      clientId,
      ...(query.budgetLineId && { budgetLineId: query.budgetLineId }),
      ...(query.allocationType && { allocationType: query.allocationType }),
    };

    const [items, total] = await Promise.all([
      this.prisma.financialAllocation.findMany({
        where,
        orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.financialAllocation.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async listByBudgetLine(
    clientId: string,
    budgetLineId: string,
    query: { limit?: number; offset?: number },
  ): Promise<ListAllocationsResult> {
    await assertBudgetLineExistsForClient(
      this.prisma,
      budgetLineId,
      clientId,
    );
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where = { clientId, budgetLineId };

    const [items, total] = await Promise.all([
      this.prisma.financialAllocation.findMany({
        where,
        orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.financialAllocation.count({ where }),
    ]);

    return { items, total, limit, offset };
  }
}
