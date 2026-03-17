import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BudgetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../../audit-logs/audit-logs.service';
import { generateEnvelopeCode } from '../helpers/code-generator.helper';
import { fromDecimal } from '../helpers/decimal.helper';
import { AuditContext, ListResult } from '../types/audit-context';
import { CreateBudgetEnvelopeDto } from './dto/create-budget-envelope.dto';
import { ListBudgetEnvelopesQueryDto } from './dto/list-budget-envelopes.query.dto';
import { UpdateBudgetEnvelopeDto } from './dto/update-budget-envelope.dto';
import type { BudgetEnvelopeDetailResponseDto } from './dto/budget-envelope-detail-response.dto';

@Injectable()
export class BudgetEnvelopesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    query: ListBudgetEnvelopesQueryDto,
  ): Promise<ListResult<EnvelopeWithNumbers>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: import('@prisma/client').Prisma.BudgetEnvelopeWhereInput = {
      clientId,
      ...(query.budgetId && { budgetId: query.budgetId }),
    };
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.budgetEnvelope.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.budgetEnvelope.count({ where }),
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
  ): Promise<BudgetEnvelopeDetailResponseDto> {
    // #region agent log
    // Diagnostic temporaire pour comprendre les 404 sur GET /api/budget-envelopes/:id
    console.log('[BudgetEnvelopesService.getById] called', {
      clientId,
      id,
    });
    // #endregion agent log

    const envelope = await this.prisma.budgetEnvelope.findFirst({
      where: { id, clientId },
      include: { budget: true },
    });
    if (!envelope) {
      // #region agent log
      console.log('[BudgetEnvelopesService.getById] envelope not found', {
        clientId,
        id,
      });
      // #endregion agent log
      throw new NotFoundException('Budget envelope not found');
    }

    // #region agent log
    console.log('[BudgetEnvelopesService.getById] envelope found', {
      clientId,
      id,
      budgetId: envelope.budgetId,
    });
    // #endregion agent log

    const sums = await this.prisma.budgetLine.aggregate({
      where: {
        clientId,
        envelopeId: id,
      },
      _sum: {
        initialAmount: true,
        revisedAmount: true,
        forecastAmount: true,
        committedAmount: true,
        consumedAmount: true,
        remainingAmount: true,
      },
    });

    const sum = sums._sum as {
      initialAmount: Prisma.Decimal | null;
      revisedAmount: Prisma.Decimal | null;
      forecastAmount: Prisma.Decimal | null;
      committedAmount: Prisma.Decimal | null;
      consumedAmount: Prisma.Decimal | null;
      remainingAmount: Prisma.Decimal | null;
    };

    return {
      id: envelope.id,
      budgetId: envelope.budgetId,
      budgetName: envelope.budget.name,
      code: envelope.code,
      name: envelope.name,
      description: envelope.description ?? null,
      status: envelope.status,
      currency: envelope.budget.currency,
      initialAmount: fromDecimal(sum.initialAmount),
      revisedAmount: fromDecimal(sum.revisedAmount),
      forecastAmount: fromDecimal(sum.forecastAmount),
      committedAmount: fromDecimal(sum.committedAmount),
      consumedAmount: fromDecimal(sum.consumedAmount),
      remainingAmount: fromDecimal(sum.remainingAmount),
    };
  }

  async create(
    clientId: string,
    dto: CreateBudgetEnvelopeDto,
    context?: AuditContext,
  ): Promise<EnvelopeWithNumbers> {
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
        'Cannot create envelope for a locked or archived budget',
      );
    }
    if (
      budget.isVersioned &&
      budget.versionStatus &&
      ['SUPERSEDED', 'ARCHIVED'].includes(budget.versionStatus)
    ) {
      throw new BadRequestException(
        'Cannot create envelope for a superseded or archived version',
      );
    }

    if (dto.parentId) {
      const parent = await this.prisma.budgetEnvelope.findFirst({
        where: {
          id: dto.parentId,
          clientId,
          budgetId: dto.budgetId,
        },
      });
      if (!parent) {
        throw new BadRequestException(
          'Parent envelope must exist and belong to the same budget and client',
        );
      }
    }

    let code = dto.code?.trim();
    if (!code) {
      code = await this.resolveUniqueEnvelopeCode(clientId, dto.budgetId);
    } else {
      const existing = await this.prisma.budgetEnvelope.findUnique({
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
          `Envelope with code "${code}" already exists in this budget`,
        );
      }
    }

    const created = await this.prisma.budgetEnvelope.create({
      data: {
        clientId,
        budgetId: dto.budgetId,
        name: dto.name,
        code,
        type: dto.type,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'budget_envelope.created',
      resourceType: 'budget_envelope',
      resourceId: created.id,
      newValue: {
        id: created.id,
        name: created.name,
        code: created.code,
        budgetId: created.budgetId,
        type: created.type,
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
    dto: UpdateBudgetEnvelopeDto,
    context?: AuditContext,
  ): Promise<EnvelopeWithNumbers> {
    const existing = await this.prisma.budgetEnvelope.findFirst({
      where: { id, clientId },
      include: { budget: true },
    });
    if (!existing) {
      throw new NotFoundException('Budget envelope not found');
    }
    if (
      existing.budget.status === BudgetStatus.LOCKED ||
      existing.budget.status === BudgetStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'Cannot update envelope when parent budget is locked or archived',
      );
    }
    if (
      existing.budget.isVersioned &&
      existing.budget.versionStatus &&
      ['SUPERSEDED', 'ARCHIVED'].includes(existing.budget.versionStatus)
    ) {
      throw new BadRequestException(
        'Cannot update envelope when parent budget is a superseded or archived version',
      );
    }

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('Envelope cannot be its own parent');
      }
      const parent = await this.prisma.budgetEnvelope.findFirst({
        where: {
          id: dto.parentId,
          clientId,
          budgetId: existing.budgetId,
        },
      });
      if (!parent) {
        throw new BadRequestException(
          'Parent envelope must exist and belong to the same budget and client',
        );
      }
    }

    if (
      dto.code != null &&
      dto.code !== existing.code
    ) {
      const conflict = await this.prisma.budgetEnvelope.findUnique({
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
          `Envelope with code "${dto.code}" already exists in this budget`,
        );
      }
    }

    const updated = await this.prisma.budgetEnvelope.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.code != null && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type != null && { type: dto.type }),
        ...(dto.parentId !== undefined && {
          parentId: dto.parentId || null,
        }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'budget_envelope.updated',
      resourceType: 'budget_envelope',
      resourceId: updated.id,
      oldValue: {
        name: existing.name,
        code: existing.code,
        type: existing.type,
      },
      newValue: {
        name: updated.name,
        code: updated.code,
        type: updated.type,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return toResponse(updated);
  }

  private async resolveUniqueEnvelopeCode(
    clientId: string,
    budgetId: string,
  ): Promise<string> {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const code = generateEnvelopeCode();
      const existing = await this.prisma.budgetEnvelope.findUnique({
        where: {
          clientId_budgetId_code: { clientId, budgetId, code },
        },
      });
      if (!existing) return code;
    }
    throw new ConflictException(
      'Could not generate unique code for budget envelope',
    );
  }
}

type EnvelopeRow = Awaited<
  ReturnType<PrismaService['budgetEnvelope']['findFirst']>
>;
type EnvelopeWithNumbers = NonNullable<EnvelopeRow>;

function toResponse(row: NonNullable<EnvelopeRow>): EnvelopeWithNumbers {
  return { ...row };
}
