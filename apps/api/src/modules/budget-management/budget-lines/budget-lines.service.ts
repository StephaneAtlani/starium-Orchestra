import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BudgetLineStatus, BudgetStatus } from '@prisma/client';
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
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BudgetLinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    query: ListBudgetLinesQueryDto,
  ): Promise<ListResult<BudgetLineResponse>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: import('@prisma/client').Prisma.BudgetLineWhereInput = {
      clientId,
      ...(query.budgetId && { budgetId: query.budgetId }),
      ...(query.envelopeId && { envelopeId: query.envelopeId }),
      ...(query.status && { status: query.status }),
      ...(query.expenseType && { expenseType: query.expenseType }),
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

    const created = await this.prisma.budgetLine.create({
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
        initialAmount: toDecimal(dto.initialAmount),
        revisedAmount: toDecimal(revisedAmount),
        forecastAmount: toDecimal(forecastAmount),
        committedAmount: toDecimal(committedAmount),
        consumedAmount: toDecimal(consumedAmount),
        remainingAmount: toDecimal(remainingAmount),
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'budget_line.created',
      resourceType: 'budget_line',
      resourceId: created.id,
      newValue: {
        id: created.id,
        name: created.name,
        code: created.code,
        budgetId: created.budgetId,
        envelopeId: created.envelopeId,
        initialAmount: dto.initialAmount,
        revisedAmount,
        currency: created.currency,
        status: created.status,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return toResponse(created);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateBudgetLineDto,
    context?: AuditContext,
  ): Promise<BudgetLineResponse> {
    const existing = await this.prisma.budgetLine.findFirst({
      where: { id, clientId },
      include: { budget: true },
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

    const baseData: import('@prisma/client').Prisma.BudgetLineUpdateInput = {
      ...(dto.name != null && { name: dto.name }),
      ...(dto.code != null && { code: dto.code }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.status != null && { status: dto.status }),
      ...(dto.currency != null && { currency: dto.currency }),
    };

    if (dto.revisedAmount !== undefined && dto.revisedAmount !== null) {
      const committed = Number(existing.committedAmount);
      const consumed = Number(existing.consumedAmount);
      const remaining = dto.revisedAmount - committed - consumed;
      baseData.revisedAmount = toDecimal(dto.revisedAmount);
      baseData.remainingAmount = toDecimal(Math.max(0, remaining));
    }

    const updated = await this.prisma.budgetLine.update({
      where: { id },
      data: baseData,
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
        revisedAmount: fromDecimal(existing.revisedAmount),
        remainingAmount: fromDecimal(existing.remainingAmount),
      },
      newValue: {
        name: updated.name,
        code: updated.code,
        status: updated.status,
        revisedAmount: fromDecimal(updated.revisedAmount),
        remainingAmount: fromDecimal(updated.remainingAmount),
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return toResponse(updated);
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

type BudgetLineRow = Awaited<
  ReturnType<PrismaService['budgetLine']['findFirst']>
>;

function toResponse(row: NonNullable<BudgetLineRow>): BudgetLineResponse {
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
