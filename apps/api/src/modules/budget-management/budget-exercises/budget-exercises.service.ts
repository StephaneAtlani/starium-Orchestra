import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BudgetExerciseStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../../audit-logs/audit-logs.service';
import { generateBudgetExerciseCode } from '../helpers/code-generator.helper';
import { AuditContext, ListResult } from '../types/audit-context';
import {
  BulkStatusApplyResult,
  BulkUpdateBudgetExerciseStatusDto,
} from '../dto/bulk-update-status.dto';
import { bulkStatusFailureMessage } from '../helpers/bulk-status-error.helper';
import { CreateBudgetExerciseDto } from './dto/create-budget-exercise.dto';
import { ListBudgetExercisesQueryDto } from './dto/list-budget-exercises.query.dto';
import { UpdateBudgetExerciseDto } from './dto/update-budget-exercise.dto';


@Injectable()
export class BudgetExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    query: ListBudgetExercisesQueryDto,
  ): Promise<ListResult<BudgetExerciseWithNumbers>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: import('@prisma/client').Prisma.BudgetExerciseWhereInput = {
      clientId,
      ...(query.status && { status: query.status }),
    };
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.budgetExercise.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.budgetExercise.count({ where }),
    ]);

    return {
      items: items.map(toResponse),
      total,
      limit,
      offset,
    };
  }

  async getById(clientId: string, id: string): Promise<BudgetExerciseWithNumbers> {
    const exercise = await this.prisma.budgetExercise.findFirst({
      where: { id, clientId },
    });
    if (!exercise) {
      throw new NotFoundException('Budget exercise not found');
    }
    return toResponse(exercise);
  }

  async create(
    clientId: string,
    dto: CreateBudgetExerciseDto,
    context?: AuditContext,
  ): Promise<BudgetExerciseWithNumbers> {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must be >= startDate');
    }

    let code = dto.code?.trim();
    if (!code) {
      code = await this.resolveUniqueExerciseCode(clientId, dto.startDate);
    } else {
      const existing = await this.prisma.budgetExercise.findUnique({
        where: { clientId_code: { clientId, code } },
      });
      if (existing) {
        throw new ConflictException(`Budget exercise with code "${code}" already exists for this client`);
      }
    }

    const created = await this.prisma.budgetExercise.create({
      data: {
        clientId,
        name: dto.name,
        code,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: dto.status ?? BudgetExerciseStatus.DRAFT,
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'budget_exercise.created',
      resourceType: 'budget_exercise',
      resourceId: created.id,
      newValue: {
        id: created.id,
        name: created.name,
        code: created.code,
        startDate: created.startDate,
        endDate: created.endDate,
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
    dto: UpdateBudgetExerciseDto,
    context?: AuditContext,
  ): Promise<BudgetExerciseWithNumbers> {
    const existing = await this.prisma.budgetExercise.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Budget exercise not found');
    }
    if (existing.status === BudgetExerciseStatus.ARCHIVED) {
      throw new BadRequestException('Cannot update an archived budget exercise');
    }

    if (dto.endDate != null && dto.startDate != null && dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must be >= startDate');
    }
    if (dto.endDate != null && existing.startDate && dto.endDate < existing.startDate) {
      throw new BadRequestException('endDate must be >= startDate');
    }
    if (dto.startDate != null && existing.endDate && dto.startDate > existing.endDate) {
      throw new BadRequestException('startDate must be <= endDate');
    }

    if (dto.code != null && dto.code !== existing.code) {
      const conflict = await this.prisma.budgetExercise.findUnique({
        where: { clientId_code: { clientId, code: dto.code } },
      });
      if (conflict) {
        throw new ConflictException(`Budget exercise with code "${dto.code}" already exists for this client`);
      }
    }

    const updated = await this.prisma.budgetExercise.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.code != null && { code: dto.code }),
        ...(dto.startDate != null && { startDate: dto.startDate }),
        ...(dto.endDate != null && { endDate: dto.endDate }),
        ...(dto.status != null && { status: dto.status }),
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'budget_exercise.updated',
      resourceType: 'budget_exercise',
      resourceId: updated.id,
      oldValue: {
        name: existing.name,
        code: existing.code,
        startDate: existing.startDate,
        endDate: existing.endDate,
        status: existing.status,
      },
      newValue: {
        name: updated.name,
        code: updated.code,
        startDate: updated.startDate,
        endDate: updated.endDate,
        status: updated.status,
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
    dto: BulkUpdateBudgetExerciseStatusDto,
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

  private async resolveUniqueExerciseCode(
    clientId: string,
    startDate: Date,
  ): Promise<string> {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const code = generateBudgetExerciseCode(startDate);
      const existing = await this.prisma.budgetExercise.findUnique({
        where: { clientId_code: { clientId, code } },
      });
      if (!existing) return code;
    }
    throw new ConflictException('Could not generate unique code for budget exercise');
  }
}

type BudgetExerciseRow = Awaited<
  ReturnType<PrismaService['budgetExercise']['findFirst']>
>;
type BudgetExerciseWithNumbers = NonNullable<BudgetExerciseRow> extends infer R
  ? { [K in keyof R]: R[K] }
  : never;

function toResponse(row: NonNullable<BudgetExerciseRow>): BudgetExerciseWithNumbers {
  return { ...row };
}
