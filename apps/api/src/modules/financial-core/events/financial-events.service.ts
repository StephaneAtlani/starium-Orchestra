import { Injectable } from '@nestjs/common';
import { FinancialEventType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../../audit-logs/audit-logs.service';
import { BudgetLineCalculatorService } from '../budget-line-calculator.service';
import { assertBudgetLineExistsForClient } from '../helpers/budget-line.helper';
import { CreateFinancialEventDto } from './dto/create-financial-event.dto';
import { ListFinancialEventsQueryDto } from './dto/list-financial-events.query.dto';

export interface ListEventsResult {
  items: Awaited<
    ReturnType<PrismaService['financialEvent']['findMany']>
  >;
  total: number;
  limit: number;
  offset: number;
}

export interface CreateEventContext {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
}

const RECALC_EVENT_TYPES: FinancialEventType[] = [
  FinancialEventType.COMMITMENT_REGISTERED,
  FinancialEventType.CONSUMPTION_REGISTERED,
];

@Injectable()
export class FinancialEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: BudgetLineCalculatorService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(
    clientId: string,
    dto: CreateFinancialEventDto,
    context?: CreateEventContext,
  ) {
    await assertBudgetLineExistsForClient(
      this.prisma,
      dto.budgetLineId,
      clientId,
    );

    const shouldRecalc = RECALC_EVENT_TYPES.includes(dto.eventType);

    const created = await this.prisma.$transaction(async (tx) => {
      const event = await tx.financialEvent.create({
        data: {
          clientId,
          budgetLineId: dto.budgetLineId,
          sourceType: dto.sourceType,
          sourceId: dto.sourceId ?? null,
          eventType: dto.eventType,
          amount: dto.amount,
          currency: dto.currency,
          eventDate: dto.eventDate,
          label: dto.label,
          description: dto.description ?? null,
        },
      });
      if (shouldRecalc) {
        await this.calculator.recalculateForBudgetLine(
          dto.budgetLineId,
          clientId,
          tx as Parameters<BudgetLineCalculatorService['recalculateForBudgetLine']>[2],
        );
      }
      return event;
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'financial_event.created',
      resourceType: 'financial_event',
      resourceId: created.id,
      newValue: {
        budgetLineId: created.budgetLineId,
        eventType: created.eventType,
        amount: Number(created.amount),
        currency: created.currency,
        eventDate: created.eventDate,
        label: created.label,
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
    query: ListFinancialEventsQueryDto,
  ): Promise<ListEventsResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where = {
      clientId,
      ...(query.budgetLineId && { budgetLineId: query.budgetLineId }),
      ...(query.eventType && { eventType: query.eventType }),
    };

    const [items, total] = await Promise.all([
      this.prisma.financialEvent.findMany({
        where,
        orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.financialEvent.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async listByBudgetLine(
    clientId: string,
    budgetLineId: string,
    query: { limit?: number; offset?: number },
  ): Promise<ListEventsResult> {
    await assertBudgetLineExistsForClient(
      this.prisma,
      budgetLineId,
      clientId,
    );
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where = { clientId, budgetLineId };

    const [items, total] = await Promise.all([
      this.prisma.financialEvent.findMany({
        where,
        orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.financialEvent.count({ where }),
    ]);

    return { items, total, limit, offset };
  }
}
