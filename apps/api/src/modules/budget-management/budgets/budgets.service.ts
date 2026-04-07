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
import { generateBudgetCode } from '../helpers/code-generator.helper';
import { AuditContext, ListResult } from '../types/audit-context';
import {
  BulkStatusApplyResult,
  BulkUpdateBudgetStatusDto,
} from '../dto/bulk-update-status.dto';
import { bulkStatusFailureMessage } from '../helpers/bulk-status-error.helper';
import { assertBudgetStatusTransition } from '../policies/budget-status-transitions';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ListBudgetsQueryDto } from './dto/list-budgets.query.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    query: ListBudgetsQueryDto,
  ): Promise<ListResult<BudgetWithNumbers>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: import('@prisma/client').Prisma.BudgetWhereInput = {
      clientId,
      ...(query.exerciseId && { exerciseId: query.exerciseId }),
      ...(query.status && { status: query.status }),
      ...(query.ownerUserId && { ownerUserId: query.ownerUserId }),
    };
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          exercise: { select: { name: true, code: true } },
          owner: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.budget.count({ where }),
    ]);

    return {
      items: items.map(toResponse),
      total,
      limit,
      offset,
    };
  }

  async getById(clientId: string, id: string): Promise<BudgetWithNumbers> {
    const budget = await this.prisma.budget.findFirst({
      where: { id, clientId },
      include: {
        exercise: { select: { name: true, code: true } },
        owner: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return toResponse(budget);
  }

  async create(
    clientId: string,
    dto: CreateBudgetDto,
    context?: AuditContext,
  ): Promise<BudgetWithNumbers> {
    const exercise = await this.prisma.budgetExercise.findFirst({
      where: { id: dto.exerciseId, clientId },
    });
    if (!exercise) {
      throw new NotFoundException(
        'Budget exercise not found or does not belong to this client',
      );
    }

    if (dto.ownerUserId) {
      const clientUser = await this.prisma.clientUser.findFirst({
        where: {
          userId: dto.ownerUserId,
          clientId,
          status: 'ACTIVE',
        },
      });
      if (!clientUser) {
        throw new BadRequestException(
          'ownerUserId must be a user linked to the active client',
        );
      }
    }

    let code = dto.code?.trim();
    if (!code) {
      code = await this.resolveUniqueBudgetCode(clientId);
    } else {
      const existing = await this.prisma.budget.findUnique({
        where: { clientId_code: { clientId, code } },
      });
      if (existing) {
        throw new ConflictException(
          `Budget with code "${code}" already exists for this client`,
        );
      }
    }

    const created = await this.prisma.budget.create({
      data: {
        clientId,
        exerciseId: dto.exerciseId,
        name: dto.name,
        code,
        description: dto.description ?? null,
        currency: dto.currency,
        status: dto.status ?? BudgetStatus.DRAFT,
        ownerUserId: dto.ownerUserId ?? null,
        ...(dto.taxMode !== undefined ? { taxMode: dto.taxMode } : {}),
        ...(dto.defaultTaxRate !== undefined
          ? { defaultTaxRate: new Prisma.Decimal(dto.defaultTaxRate) }
          : {}),
      },
      include: {
        exercise: { select: { name: true, code: true } },
        owner: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'budget.created',
      resourceType: 'budget',
      resourceId: created.id,
      newValue: {
        id: created.id,
        name: created.name,
        code: created.code,
        exerciseId: created.exerciseId,
        currency: created.currency,
        status: created.status,
        taxMode: created.taxMode,
        defaultTaxRate: created.defaultTaxRate ? Number(created.defaultTaxRate) : null,
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
    dto: UpdateBudgetDto,
    context?: AuditContext,
  ): Promise<BudgetWithNumbers> {
    const existing = await this.prisma.budget.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Budget not found');
    }
    if (
      existing.status === BudgetStatus.LOCKED ||
      existing.status === BudgetStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'Cannot update a locked or archived budget',
      );
    }
    if (
      existing.isVersioned &&
      existing.versionStatus &&
      ['SUPERSEDED', 'ARCHIVED'].includes(existing.versionStatus)
    ) {
      throw new BadRequestException(
        'Cannot update a superseded or archived version',
      );
    }

    if (dto.ownerUserId !== undefined) {
      if (dto.ownerUserId) {
        const clientUser = await this.prisma.clientUser.findFirst({
          where: {
            userId: dto.ownerUserId,
            clientId,
            status: 'ACTIVE',
          },
        });
        if (!clientUser) {
          throw new BadRequestException(
            'ownerUserId must be a user linked to the active client',
          );
        }
      }
    }

    if (dto.code != null && dto.code !== existing.code) {
      const conflict = await this.prisma.budget.findUnique({
        where: { clientId_code: { clientId, code: dto.code } },
      });
      if (conflict) {
        throw new ConflictException(
          `Budget with code "${dto.code}" already exists for this client`,
        );
      }
    }

    if (dto.status != null && dto.status !== existing.status) {
      assertBudgetStatusTransition(existing.status, dto.status);
    }

    const updated = await this.prisma.budget.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.code != null && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.currency != null && { currency: dto.currency }),
        ...(dto.status != null && { status: dto.status }),
        ...(dto.ownerUserId !== undefined && {
          ownerUserId: dto.ownerUserId || null,
        }),
        ...(dto.taxMode !== undefined ? { taxMode: dto.taxMode } : {}),
        ...(dto.defaultTaxRate !== undefined
          ? { defaultTaxRate: new Prisma.Decimal(dto.defaultTaxRate) }
          : {}),
      },
      include: {
        exercise: { select: { name: true, code: true } },
        owner: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'budget.updated',
      resourceType: 'budget',
      resourceId: updated.id,
      oldValue: {
        name: existing.name,
        code: existing.code,
        status: existing.status,
        taxMode: existing.taxMode,
        defaultTaxRate: existing.defaultTaxRate ? Number(existing.defaultTaxRate) : null,
      },
      newValue: {
        name: updated.name,
        code: updated.code,
        status: updated.status,
        taxMode: updated.taxMode,
        defaultTaxRate: updated.defaultTaxRate ? Number(updated.defaultTaxRate) : null,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return toResponse(updated);
  }

  async bulkUpdateStatus(
    clientId: string,
    dto: BulkUpdateBudgetStatusDto,
    context?: AuditContext,
  ): Promise<BulkStatusApplyResult> {
    const uniqueIds = [...new Set(dto.ids)];
    const updatedIds: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of uniqueIds) {
      try {
        await this.update(clientId, id, { status: dto.status }, context);
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

  private async resolveUniqueBudgetCode(clientId: string): Promise<string> {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const code = generateBudgetCode();
      const existing = await this.prisma.budget.findUnique({
        where: { clientId_code: { clientId, code } },
      });
      if (!existing) return code;
    }
    throw new ConflictException('Could not generate unique code for budget');
  }
}

type BudgetRow = Awaited<ReturnType<PrismaService['budget']['findFirst']>>;
type BudgetWithNumbers = Omit<NonNullable<BudgetRow>, 'defaultTaxRate' | 'exercise' | 'owner'> & {
  defaultTaxRate: number | null;
  exerciseName?: string;
  exerciseCode?: string | null;
  /** Libellé affichable (prénom + nom ou email) — dérivé de `owner` en base. */
  ownerUserName: string | null;
};

function formatOwnerDisplayName(
  owner: { firstName: string | null; lastName: string | null; email: string } | null | undefined,
): string | null {
  if (!owner) return null;
  const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim();
  return name || owner.email;
}

function toResponse(
  row: NonNullable<BudgetRow> & {
    exercise?: { name: string; code: string } | null;
    owner?: { firstName: string | null; lastName: string | null; email: string } | null;
  },
): BudgetWithNumbers {
  const { exercise, defaultTaxRate, owner, ...rest } = row;
  return {
    ...rest,
    defaultTaxRate: defaultTaxRate ? Number(defaultTaxRate) : null,
    ownerUserName: formatOwnerDisplayName(owner),
    ...(exercise && {
      exerciseName: exercise.name,
      exerciseCode: exercise.code,
    }),
  };
}
