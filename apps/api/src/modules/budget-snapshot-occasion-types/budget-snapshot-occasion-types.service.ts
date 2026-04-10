import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { CreateBudgetSnapshotOccasionTypeDto } from './dto/create-budget-snapshot-occasion-type.dto';
import { UpdateBudgetSnapshotOccasionTypeDto } from './dto/update-budget-snapshot-occasion-type.dto';
import {
  BudgetSnapshotOccasionTypeItem,
  OccasionTypeScope,
} from './types/budget-snapshot-occasion-type.types';

export interface OccasionTypeAuditContext {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
}

function toItem(
  row: {
    id: string;
    clientId: string | null;
    code: string;
    label: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
): BudgetSnapshotOccasionTypeItem {
  const scope: OccasionTypeScope = row.clientId ? 'client' : 'global';
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    scope,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class BudgetSnapshotOccasionTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /** Liste fusionnée pour le client actif : globaux actifs + types client actifs. */
  async listMergedForClient(
    clientId: string,
  ): Promise<BudgetSnapshotOccasionTypeItem[]> {
    const [globalRows, clientRows] = await Promise.all([
      this.prisma.budgetSnapshotOccasionType.findMany({
        where: { clientId: null, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      }),
      this.prisma.budgetSnapshotOccasionType.findMany({
        where: { clientId, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      }),
    ]);
    return [
      ...globalRows.map((r) => toItem(r)),
      ...clientRows.map((r) => toItem(r)),
    ];
  }

  async listGlobal(): Promise<BudgetSnapshotOccasionTypeItem[]> {
    const rows = await this.prisma.budgetSnapshotOccasionType.findMany({
      where: { clientId: null },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return rows.map((r) => toItem(r));
  }

  async createGlobal(
    dto: CreateBudgetSnapshotOccasionTypeDto,
    context?: OccasionTypeAuditContext,
  ): Promise<BudgetSnapshotOccasionTypeItem> {
    const dup = await this.prisma.budgetSnapshotOccasionType.findFirst({
      where: { clientId: null, code: dto.code },
    });
    if (dup) {
      throw new ConflictException(
        `Global occasion type with code "${dto.code}" already exists`,
      );
    }
    const row = await this.prisma.budgetSnapshotOccasionType.create({
      data: {
        clientId: null,
        code: dto.code,
        label: dto.label,
        description: dto.description ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
      },
    });
    await this.auditOccasionType('budget_snapshot_occasion_type.created', {
      clientId: null,
      userId: context?.actorUserId,
      resourceId: row.id,
      newValue: { code: row.code, label: row.label, scope: 'global' },
      meta: context?.meta,
    });
    return toItem(row);
  }

  async updateGlobal(
    id: string,
    dto: UpdateBudgetSnapshotOccasionTypeDto,
    context?: OccasionTypeAuditContext,
  ): Promise<BudgetSnapshotOccasionTypeItem> {
    const existing = await this.prisma.budgetSnapshotOccasionType.findFirst({
      where: { id, clientId: null },
    });
    if (!existing) {
      throw new NotFoundException('Global occasion type not found');
    }
    if (dto.code !== undefined && dto.code !== existing.code) {
      const dup = await this.prisma.budgetSnapshotOccasionType.findFirst({
        where: { clientId: null, code: dto.code, NOT: { id } },
      });
      if (dup) {
        throw new ConflictException(
          `Global occasion type with code "${dto.code}" already exists`,
        );
      }
    }
    const row = await this.prisma.budgetSnapshotOccasionType.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    await this.auditOccasionType('budget_snapshot_occasion_type.updated', {
      clientId: null,
      userId: context?.actorUserId,
      resourceId: row.id,
      newValue: { code: row.code, label: row.label, isActive: row.isActive },
      meta: context?.meta,
    });
    return toItem(row);
  }

  async softDeleteGlobal(
    id: string,
    context?: OccasionTypeAuditContext,
  ): Promise<BudgetSnapshotOccasionTypeItem> {
    return this.updateGlobal(id, { isActive: false }, context);
  }

  async createForClient(
    clientId: string,
    dto: CreateBudgetSnapshotOccasionTypeDto,
    context?: OccasionTypeAuditContext,
  ): Promise<BudgetSnapshotOccasionTypeItem> {
    const globalDup = await this.prisma.budgetSnapshotOccasionType.findFirst({
      where: { clientId: null, code: dto.code, isActive: true },
    });
    if (globalDup) {
      throw new BadRequestException(
        `Code "${dto.code}" is already used by a platform-wide occasion type`,
      );
    }
    try {
      const row = await this.prisma.budgetSnapshotOccasionType.create({
        data: {
          clientId,
          code: dto.code,
          label: dto.label,
          description: dto.description ?? null,
          sortOrder: dto.sortOrder ?? 0,
          isActive: true,
        },
      });
      await this.auditOccasionType('budget_snapshot_occasion_type.created', {
        clientId,
        userId: context?.actorUserId,
        resourceId: row.id,
        newValue: { code: row.code, label: row.label, scope: 'client' },
        meta: context?.meta,
      });
      return toItem(row);
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          `Occasion type with code "${dto.code}" already exists for this client`,
        );
      }
      throw e;
    }
  }

  async updateForClient(
    clientId: string,
    id: string,
    dto: UpdateBudgetSnapshotOccasionTypeDto,
    context?: OccasionTypeAuditContext,
  ): Promise<BudgetSnapshotOccasionTypeItem> {
    const existing = await this.prisma.budgetSnapshotOccasionType.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Occasion type not found');
    }
    if (dto.code !== undefined && dto.code !== existing.code) {
      const globalDup = await this.prisma.budgetSnapshotOccasionType.findFirst({
        where: { clientId: null, code: dto.code, isActive: true },
      });
      if (globalDup) {
        throw new BadRequestException(
          `Code "${dto.code}" is already used by a platform-wide occasion type`,
        );
      }
    }
    try {
      const row = await this.prisma.budgetSnapshotOccasionType.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
      await this.auditOccasionType('budget_snapshot_occasion_type.updated', {
        clientId,
        userId: context?.actorUserId,
        resourceId: row.id,
        newValue: { code: row.code, label: row.label, isActive: row.isActive },
        meta: context?.meta,
      });
      return toItem(row);
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          `Occasion type with code "${dto.code ?? existing.code}" already exists for this client`,
        );
      }
      throw e;
    }
  }

  async softDeleteForClient(
    clientId: string,
    id: string,
    context?: OccasionTypeAuditContext,
  ): Promise<BudgetSnapshotOccasionTypeItem> {
    return this.updateForClient(clientId, id, { isActive: false }, context);
  }

  /**
   * Vérifie qu’un type peut être rattaché à un snapshot du client (actif, global ou même client).
   */
  async assertOccasionTypeAssignable(
    clientId: string,
    occasionTypeId: string,
  ): Promise<void> {
    const t = await this.prisma.budgetSnapshotOccasionType.findFirst({
      where: {
        id: occasionTypeId,
        isActive: true,
        OR: [{ clientId: null }, { clientId }],
      },
    });
    if (!t) {
      throw new BadRequestException(
        'Invalid or inactive occasion type for this client',
      );
    }
  }

  private async auditOccasionType(
    action: string,
    input: {
      clientId: string | null;
      userId?: string;
      resourceId: string;
      newValue: Record<string, unknown>;
      meta?: OccasionTypeAuditContext['meta'];
    },
  ): Promise<void> {
    if (!input.clientId) {
      // AuditLog impose un clientId ; actions plateforme (types globaux) sans journal pour l’instant.
      return;
    }
    const auditInput: CreateAuditLogInput = {
      clientId: input.clientId,
      userId: input.userId,
      action,
      resourceType: 'budget_snapshot_occasion_type',
      resourceId: input.resourceId,
      newValue: input.newValue,
      ipAddress: input.meta?.ipAddress,
      userAgent: input.meta?.userAgent,
      requestId: input.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);
  }
}
