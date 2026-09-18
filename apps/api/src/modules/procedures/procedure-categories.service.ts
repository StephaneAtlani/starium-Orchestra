import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  type CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import {
  CreateProcedureCategoryDto,
  UpdateProcedureCategoryDto,
} from './dto/procedure-category.dto';

export type ProcedureCategoryResponse = {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
};

export const DEFAULT_PROCEDURE_CATEGORIES: Array<{
  code: string;
  label: string;
  sortOrder: number;
}> = [
  { code: 'PILOTAGE', label: 'Pilotage', sortOrder: 0 },
  { code: 'COMPLIANCE', label: 'Conformité', sortOrder: 1 },
  { code: 'FINANCE', label: 'Finance', sortOrder: 2 },
  { code: 'ORGANISATION', label: 'Organisation', sortOrder: 3 },
  { code: 'SECURITY', label: 'Sécurité', sortOrder: 4 },
];

type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

@Injectable()
export class ProcedureCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    opts?: { activeOnly?: boolean },
  ): Promise<ProcedureCategoryResponse[]> {
    await this.ensureDefaults(clientId);
    const rows = await this.prisma.procedureCategory.findMany({
      where: {
        clientId,
        ...(opts?.activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return rows.map(toResponse);
  }

  async create(
    clientId: string,
    dto: CreateProcedureCategoryDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ): Promise<ProcedureCategoryResponse> {
    await this.ensureDefaults(clientId);
    const label = dto.label.trim();
    if (!label) throw new BadRequestException('Libellé obligatoire');
    const code = normalizeCategoryCode(dto.code?.trim() || slugFromLabel(label));
    if (!code) throw new BadRequestException('Code catégorie invalide');

    try {
      const row = await this.prisma.procedureCategory.create({
        data: {
          clientId,
          code,
          label,
          sortOrder: await this.nextSortOrder(clientId),
          isActive: true,
        },
      });
      await this.audit({
        clientId,
        userId: actorUserId,
        action: 'procedure.category.created',
        resourceId: row.id,
        newValue: { code: row.code, label: row.label },
        meta,
      });
      return toResponse(row);
    } catch (e) {
      if (isUnique(e)) {
        throw new ConflictException(
          'Une catégorie avec ce code existe déjà pour ce client',
        );
      }
      throw e;
    }
  }

  async update(
    clientId: string,
    categoryId: string,
    dto: UpdateProcedureCategoryDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ): Promise<ProcedureCategoryResponse> {
    const existing = await this.prisma.procedureCategory.findFirst({
      where: { id: categoryId, clientId },
    });
    if (!existing) throw new NotFoundException('Catégorie introuvable');

    if (dto.isActive === false && existing.isActive) {
      const usage = await this.prisma.procedure.count({
        where: { clientId, categoryId },
      });
      if (usage > 0) {
        throw new BadRequestException(
          'Impossible de désactiver une catégorie utilisée par des procédures',
        );
      }
    }

    const label = dto.label?.trim();
    const row = await this.prisma.procedureCategory.update({
      where: { id: categoryId },
      data: {
        ...(label ? { label } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.audit({
      clientId,
      userId: actorUserId,
      action: 'procedure.category.updated',
      resourceId: row.id,
      oldValue: {
        label: existing.label,
        sortOrder: existing.sortOrder,
        isActive: existing.isActive,
      },
      newValue: {
        label: row.label,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
      },
      meta,
    });

    return toResponse(row);
  }

  /** Résout un categoryId actif du client, ou le défaut PILOTAGE. */
  async resolveActiveCategoryId(
    clientId: string,
    categoryId?: string | null,
  ): Promise<string> {
    await this.ensureDefaults(clientId);
    if (categoryId) {
      const row = await this.prisma.procedureCategory.findFirst({
        where: { id: categoryId, clientId, isActive: true },
        select: { id: true },
      });
      if (!row) {
        throw new BadRequestException(
          'Catégorie introuvable ou inactive pour ce client',
        );
      }
      return row.id;
    }
    const pilotage = await this.prisma.procedureCategory.findFirst({
      where: { clientId, code: 'PILOTAGE', isActive: true },
      select: { id: true },
    });
    if (!pilotage) {
      throw new BadRequestException(
        'Aucune catégorie par défaut disponible — configurez le module',
      );
    }
    return pilotage.id;
  }

  async ensureDefaults(clientId: string): Promise<void> {
    const count = await this.prisma.procedureCategory.count({
      where: { clientId },
    });
    if (count > 0) return;
    await this.prisma.procedureCategory.createMany({
      data: DEFAULT_PROCEDURE_CATEGORIES.map((c) => ({
        clientId,
        code: c.code,
        label: c.label,
        sortOrder: c.sortOrder,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }

  private async nextSortOrder(clientId: string): Promise<number> {
    const agg = await this.prisma.procedureCategory.aggregate({
      where: { clientId },
      _max: { sortOrder: true },
    });
    return (agg._max.sortOrder ?? -1) + 1;
  }

  private async audit(input: {
    clientId: string;
    userId?: string;
    action: string;
    resourceId: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    meta?: AuditMeta;
  }) {
    const payload: CreateAuditLogInput = {
      clientId: input.clientId,
      userId: input.userId,
      action: input.action,
      resourceType: 'ProcedureCategory',
      resourceId: input.resourceId,
      oldValue: input.oldValue,
      newValue: input.newValue,
      ipAddress: input.meta?.ipAddress,
      userAgent: input.meta?.userAgent,
      requestId: input.meta?.requestId,
    };
    await this.auditLogs.create(payload);
  }
}

function toResponse(row: {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: Date;
}): ProcedureCategoryResponse {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function normalizeCategoryCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export function slugFromLabel(label: string): string {
  const ascii = label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase();
  return normalizeCategoryCode(ascii.replace(/\s+/g, '_'));
}

function isUnique(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}
