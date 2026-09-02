import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BudgetImportEntityType,
  BudgetImportPurpose,
  BudgetImportSourceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateBudgetImportMappingDto } from './dto/create-mapping.dto';
import { UpdateBudgetImportMappingDto } from './dto/update-mapping.dto';
import { ListBudgetImportMappingsQueryDto } from './dto/list-mappings.query.dto';

export interface BudgetImportMappingResponse {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  sourceType: BudgetImportSourceType;
  entityType: BudgetImportEntityType;
  sheetName: string | null;
  headerRowIndex: number;
  mappingConfig: object;
  optionsConfig: object | null;
  importPurpose: BudgetImportPurpose;
  defaultBudgetId: string | null;
  defaultBudgetLabel: string | null;
  lastUsedAt: Date | null;
  jobCount: number;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListMappingsResult {
  items: BudgetImportMappingResponse[];
  total: number;
  limit: number;
  offset: number;
}

const mappingInclude = {
  defaultBudget: { select: { id: true, name: true, code: true } },
  _count: { select: { jobs: true } },
} satisfies Prisma.BudgetImportMappingInclude;

type MappingRow = Prisma.BudgetImportMappingGetPayload<{
  include: typeof mappingInclude;
}>;

function defaultBudgetLabelOf(
  budget: MappingRow['defaultBudget'],
): string | null {
  if (!budget) return null;
  const name = budget.name?.trim();
  const code = budget.code?.trim();
  if (name && code) return `${name} (${code})`;
  return name || code || 'Budget';
}

function toResponse(m: MappingRow): BudgetImportMappingResponse {
  return {
    id: m.id,
    clientId: m.clientId,
    name: m.name,
    description: m.description,
    sourceType: m.sourceType,
    entityType: m.entityType,
    sheetName: m.sheetName,
    headerRowIndex: m.headerRowIndex,
    mappingConfig: m.mappingConfig as object,
    optionsConfig: (m.optionsConfig as object | null) ?? null,
    importPurpose: m.importPurpose,
    defaultBudgetId: m.defaultBudgetId,
    defaultBudgetLabel: defaultBudgetLabelOf(m.defaultBudget),
    lastUsedAt: m.lastUsedAt,
    jobCount: m._count.jobs,
    createdById: m.createdById,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

@Injectable()
export class BudgetImportMappingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private async assertDefaultBudget(
    clientId: string,
    defaultBudgetId: string | null | undefined,
  ): Promise<string | null | undefined> {
    if (defaultBudgetId === undefined) return undefined;
    if (defaultBudgetId === null || defaultBudgetId === '') return null;
    const budget = await this.prisma.budget.findFirst({
      where: { id: defaultBudgetId, clientId },
      select: { id: true },
    });
    if (!budget) {
      throw new BadRequestException(
        'defaultBudgetId introuvable pour ce client',
      );
    }
    return budget.id;
  }

  async list(
    clientId: string,
    query: ListBudgetImportMappingsQueryDto,
  ): Promise<ListMappingsResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: Prisma.BudgetImportMappingWhereInput = { clientId };
    if (query.importPurpose) where.importPurpose = query.importPurpose;
    if (query.sourceType) where.sourceType = query.sourceType;
    if (query.defaultBudgetId) where.defaultBudgetId = query.defaultBudgetId;
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.budgetImportMapping.findMany({
        where,
        include: mappingInclude,
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.budgetImportMapping.count({ where }),
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
  ): Promise<BudgetImportMappingResponse> {
    const mapping = await this.prisma.budgetImportMapping.findFirst({
      where: { id, clientId },
      include: mappingInclude,
    });
    if (!mapping) {
      throw new NotFoundException('Budget import mapping not found');
    }
    return toResponse(mapping);
  }

  async create(
    clientId: string,
    dto: CreateBudgetImportMappingDto,
    userId?: string,
  ): Promise<BudgetImportMappingResponse> {
    const defaultBudgetId = await this.assertDefaultBudget(
      clientId,
      dto.defaultBudgetId,
    );
    const created = await this.prisma.budgetImportMapping.create({
      data: {
        clientId,
        name: dto.name,
        description: dto.description ?? null,
        sourceType: dto.sourceType,
        entityType: dto.entityType ?? 'BUDGET_LINES',
        sheetName: dto.sheetName ?? null,
        headerRowIndex: dto.headerRowIndex ?? 1,
        mappingConfig: dto.mappingConfig as object,
        optionsConfig: (dto.optionsConfig as object) ?? null,
        importPurpose: dto.importPurpose ?? BudgetImportPurpose.MIXED,
        defaultBudgetId: defaultBudgetId === undefined ? null : defaultBudgetId,
        createdById: userId ?? null,
      },
      include: mappingInclude,
    });
    await this.auditLogs.create({
      clientId,
      userId,
      action: 'budget_import_mapping.created',
      resourceType: 'budget_import_mapping',
      resourceId: created.id,
      newValue: { id: created.id, name: created.name },
    });
    return toResponse(created);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateBudgetImportMappingDto,
    userId?: string,
  ): Promise<BudgetImportMappingResponse> {
    const existing = await this.prisma.budgetImportMapping.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Budget import mapping not found');
    }
    const defaultBudgetId = await this.assertDefaultBudget(
      clientId,
      dto.defaultBudgetId,
    );
    const updated = await this.prisma.budgetImportMapping.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sheetName !== undefined && { sheetName: dto.sheetName }),
        ...(dto.headerRowIndex != null && {
          headerRowIndex: dto.headerRowIndex,
        }),
        ...(dto.mappingConfig != null && {
          mappingConfig: dto.mappingConfig as object,
        }),
        ...(dto.optionsConfig !== undefined && {
          optionsConfig: dto.optionsConfig as object,
        }),
        ...(dto.importPurpose != null && { importPurpose: dto.importPurpose }),
        ...(defaultBudgetId !== undefined && { defaultBudgetId }),
      },
      include: mappingInclude,
    });
    await this.auditLogs.create({
      clientId,
      userId,
      action: 'budget_import_mapping.updated',
      resourceType: 'budget_import_mapping',
      resourceId: updated.id,
      newValue: { id: updated.id, name: updated.name },
    });
    return toResponse(updated);
  }

  async duplicate(
    clientId: string,
    id: string,
    userId?: string,
  ): Promise<BudgetImportMappingResponse> {
    const existing = await this.prisma.budgetImportMapping.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Budget import mapping not found');
    }
    const created = await this.prisma.budgetImportMapping.create({
      data: {
        clientId,
        name: `${existing.name} (copie)`,
        description: existing.description,
        sourceType: existing.sourceType,
        entityType: existing.entityType,
        sheetName: existing.sheetName,
        headerRowIndex: existing.headerRowIndex,
        mappingConfig: existing.mappingConfig as object,
        optionsConfig: (existing.optionsConfig as object) ?? null,
        importPurpose: existing.importPurpose,
        defaultBudgetId: existing.defaultBudgetId,
        createdById: userId ?? null,
      },
      include: mappingInclude,
    });
    await this.auditLogs.create({
      clientId,
      userId,
      action: 'budget_import_mapping.duplicated',
      resourceType: 'budget_import_mapping',
      resourceId: created.id,
      newValue: {
        id: created.id,
        name: created.name,
        sourceId: existing.id,
      },
    });
    return toResponse(created);
  }

  async delete(
    clientId: string,
    id: string,
    userId?: string,
  ): Promise<void> {
    const existing = await this.prisma.budgetImportMapping.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Budget import mapping not found');
    }
    await this.prisma.budgetImportMapping.delete({ where: { id } });
    await this.auditLogs.create({
      clientId,
      userId,
      action: 'budget_import_mapping.deleted',
      resourceType: 'budget_import_mapping',
      resourceId: id,
      newValue: { id, name: existing.name },
    });
  }
}
