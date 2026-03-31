import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { ProcurementAuditContext } from '../suppliers/suppliers.service';
import { CreateSupplierCategoryDto } from './dto/create-supplier-category.dto';
import { ListSupplierCategoriesQueryDto } from './dto/list-supplier-categories.query.dto';
import { UpdateSupplierCategoryDto } from './dto/update-supplier-category.dto';

export interface SupplierCategoryResponse {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListSupplierCategoriesResult {
  items: SupplierCategoryResponse[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class SupplierCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    query: ListSupplierCategoriesQueryDto,
  ): Promise<ListSupplierCategoriesResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: Prisma.SupplierCategoryWhereInput = {
      clientId,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.search?.trim()
        ? {
            name: {
              contains: query.search.trim(),
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.supplierCategory.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.supplierCategory.count({ where }),
    ]);
    return { items: items.map(toSupplierCategoryResponse), total, limit, offset };
  }

  async getById(clientId: string, id: string): Promise<SupplierCategoryResponse> {
    const row = await this.prisma.supplierCategory.findFirst({
      where: { id, clientId },
    });
    if (!row) {
      throw new NotFoundException('Supplier category not found');
    }
    return toSupplierCategoryResponse(row);
  }

  async create(
    clientId: string,
    dto: CreateSupplierCategoryDto,
    context?: ProcurementAuditContext,
  ): Promise<SupplierCategoryResponse> {
    const name = normalizeSupplierCategoryDisplayName(dto.name);
    const normalizedName = normalizeSupplierCategoryName(name);
    const conflict = await this.prisma.supplierCategory.findFirst({
      where: { clientId, normalizedName },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('Supplier category name already exists');
    }

    let created;
    try {
      created = await this.prisma.supplierCategory.create({
        data: {
          clientId,
          name,
          normalizedName,
          code: dto.code?.trim() || null,
          color: dto.color?.trim() || null,
          icon: dto.icon?.trim() || null,
          sortOrder: dto.sortOrder ?? 0,
          isActive: true,
        },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Supplier category name already exists');
      }
      throw error;
    }

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier_category.created',
      resourceType: 'supplier_category',
      resourceId: created.id,
      newValue: {
        name: created.name,
        code: created.code,
        isActive: created.isActive,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return toSupplierCategoryResponse(created);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateSupplierCategoryDto,
    context?: ProcurementAuditContext,
  ): Promise<SupplierCategoryResponse> {
    const existing = await this.prisma.supplierCategory.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Supplier category not found');
    }

    const nextName = dto.name
      ? normalizeSupplierCategoryDisplayName(dto.name)
      : existing.name;
    const nextNormalizedName = dto.name
      ? normalizeSupplierCategoryName(dto.name)
      : existing.normalizedName;

    const conflict = await this.prisma.supplierCategory.findFirst({
      where: { clientId, normalizedName: nextNormalizedName, id: { not: id } },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('Supplier category name already exists');
    }

    let updated;
    try {
      updated = await this.prisma.supplierCategory.update({
        where: { id },
        data: {
          name: nextName,
          normalizedName: nextNormalizedName,
          ...(dto.code !== undefined && { code: dto.code?.trim() || null }),
          ...(dto.color !== undefined && { color: dto.color?.trim() || null }),
          ...(dto.icon !== undefined && { icon: dto.icon?.trim() || null }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Supplier category name already exists');
      }
      throw error;
    }

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier_category.updated',
      resourceType: 'supplier_category',
      resourceId: updated.id,
      oldValue: {
        name: existing.name,
        code: existing.code,
        isActive: existing.isActive,
      },
      newValue: {
        name: updated.name,
        code: updated.code,
        isActive: updated.isActive,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return toSupplierCategoryResponse(updated);
  }

  async deactivate(
    clientId: string,
    id: string,
    context?: ProcurementAuditContext,
  ): Promise<SupplierCategoryResponse> {
    const existing = await this.prisma.supplierCategory.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Supplier category not found');
    }
    if (!existing.isActive) {
      return toSupplierCategoryResponse(existing);
    }
    const updated = await this.prisma.supplierCategory.update({
      where: { id },
      data: { isActive: false },
    });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier_category.deactivated',
      resourceType: 'supplier_category',
      resourceId: updated.id,
      oldValue: { isActive: true },
      newValue: { isActive: false },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return toSupplierCategoryResponse(updated);
  }
}

export function normalizeSupplierCategoryName(name: string): string {
  return normalizeSupplierCategoryDisplayName(name).toLowerCase();
}

function normalizeSupplierCategoryDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function toSupplierCategoryResponse(
  row: Prisma.SupplierCategoryGetPayload<Record<string, never>>,
): SupplierCategoryResponse {
  return {
    id: row.id,
    clientId: row.clientId,
    name: row.name,
    code: row.code ?? null,
    color: row.color ?? null,
    icon: row.icon ?? null,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
