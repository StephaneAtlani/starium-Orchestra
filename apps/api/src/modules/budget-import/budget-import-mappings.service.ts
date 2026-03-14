import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BudgetImportEntityType,
  BudgetImportSourceType,
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

@Injectable()
export class BudgetImportMappingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    query: ListBudgetImportMappingsQueryDto,
  ): Promise<ListMappingsResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const [items, total] = await Promise.all([
      this.prisma.budgetImportMapping.findMany({
        where: { clientId },
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.budgetImportMapping.count({ where: { clientId } }),
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
        optionsConfig: dto.optionsConfig as object ?? null,
        createdById: userId ?? null,
      },
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
    const updated = await this.prisma.budgetImportMapping.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sheetName !== undefined && { sheetName: dto.sheetName }),
        ...(dto.headerRowIndex != null && { headerRowIndex: dto.headerRowIndex }),
        ...(dto.mappingConfig != null && { mappingConfig: dto.mappingConfig as object }),
        ...(dto.optionsConfig !== undefined && { optionsConfig: dto.optionsConfig as object }),
      },
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

function toResponse(
  m: import('@prisma/client').BudgetImportMapping,
): BudgetImportMappingResponse {
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
    optionsConfig: m.optionsConfig as object ?? null,
    createdById: m.createdById,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}
