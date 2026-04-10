import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BudgetEnvelopeStatus, BudgetStatus, Prisma } from '@prisma/client';
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
import {
  entityKeysFromDto,
  newValueWithStatusComment,
  normalizeStatusChangeComment,
} from '../helpers/status-change-comment.helper';
import { ClientBudgetWorkflowSettingsService } from '../../clients/client-budget-workflow-settings.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ListBudgetsQueryDto } from './dto/list-budgets.query.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetSnapshotsService } from '../../budget-snapshots/budget-snapshots.service';

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly clientBudgetWorkflowSettings: ClientBudgetWorkflowSettingsService,
    private readonly budgetSnapshots: BudgetSnapshotsService,
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

    if (
      dto.status === BudgetStatus.VALIDATED &&
      dto.status !== existing.status
    ) {
      const resolved =
        await this.clientBudgetWorkflowSettings.getResolvedForClient(clientId);
      if (resolved.requireEnvelopesNonDraftForBudgetValidated) {
        const draftEnvelopeCount = await this.prisma.budgetEnvelope.count({
          where: {
            budgetId: id,
            clientId,
            status: BudgetEnvelopeStatus.DRAFT,
          },
        });
        if (draftEnvelopeCount > 0) {
          throw new BadRequestException(
            'Cannot validate budget: every envelope must leave DRAFT status first',
          );
        }
      }
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

    // RFC-032 §4.1.5 : statut seul → `budget.status.changed` uniquement ; statut + autres champs →
    // `budget.status.changed` puis `budget.updated` sans propriété `status` ; sinon `budget.updated` complet.
    const dtoRecord = dto as Record<string, unknown>;
    const keysInDto = entityKeysFromDto(dtoRecord);
    const statusComment = normalizeStatusChangeComment(dto.statusChangeComment);
    const statusChanged =
      dto.status !== undefined && dto.status !== existing.status;
    const onlyStatusInDto =
      keysInDto.length === 1 && keysInDto[0] === 'status';

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    if (onlyStatusInDto && !statusChanged) {
      return toResponse(updated);
    }

    if (onlyStatusInDto && statusChanged) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'budget.status.changed',
        resourceType: 'budget',
        resourceId: updated.id,
        oldValue: { from: existing.status },
        newValue: newValueWithStatusComment(updated.status, statusComment),
        ...meta,
      });
    } else if (statusChanged && !onlyStatusInDto) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'budget.status.changed',
        resourceType: 'budget',
        resourceId: updated.id,
        oldValue: { from: existing.status },
        newValue: newValueWithStatusComment(updated.status, statusComment),
        ...meta,
      });
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'budget.updated',
        resourceType: 'budget',
        resourceId: updated.id,
        oldValue: {
          name: existing.name,
          code: existing.code,
          taxMode: existing.taxMode,
          defaultTaxRate: existing.defaultTaxRate
            ? Number(existing.defaultTaxRate)
            : null,
        },
        newValue: {
          name: updated.name,
          code: updated.code,
          taxMode: updated.taxMode,
          defaultTaxRate: updated.defaultTaxRate
            ? Number(updated.defaultTaxRate)
            : null,
        },
        ...meta,
      });
    } else {
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
          defaultTaxRate: existing.defaultTaxRate
            ? Number(existing.defaultTaxRate)
            : null,
        },
        newValue: {
          name: updated.name,
          code: updated.code,
          status: updated.status,
          taxMode: updated.taxMode,
          defaultTaxRate: updated.defaultTaxRate
            ? Number(updated.defaultTaxRate)
            : null,
        },
        ...meta,
      };
      await this.auditLogs.create(auditInput);
    }

    if (
      statusChanged &&
      (updated.status === BudgetStatus.SUBMITTED ||
        updated.status === BudgetStatus.VALIDATED)
    ) {
      try {
        await this.budgetSnapshots.createWorkflowMilestoneSnapshot(
          clientId,
          id,
          updated.status === BudgetStatus.SUBMITTED ? 'SUBMITTED' : 'VALIDATED',
          {
            actorUserId: context?.actorUserId,
            meta: context?.meta,
          },
        );
      } catch (err) {
        this.logger.error(
          `Échec de la version figée workflow pour le budget ${id} (${updated.status})`,
          err instanceof Error ? err.stack : err,
        );
        await this.auditLogs.create({
          clientId,
          userId: context?.actorUserId,
          action: 'budget.workflow_snapshot.failed',
          resourceType: 'budget',
          resourceId: id,
          newValue: {
            milestone: updated.status,
            error:
              err instanceof Error ? err.message : String(err),
          },
          ...meta,
        });
      }
    }

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
        await this.update(clientId, id, {
          status: dto.status,
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
