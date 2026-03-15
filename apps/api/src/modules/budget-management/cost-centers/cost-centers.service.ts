import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../../audit-logs/audit-logs.service';
import { AuditContext, ListResult } from '../types/audit-context';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { ListCostCentersQueryDto } from './dto/list-cost-centers.query.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';

export interface CostCenterResponse {
  id: string;
  clientId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CostCentersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    query: ListCostCentersQueryDto,
  ): Promise<ListResult<CostCenterResponse>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: import('@prisma/client').Prisma.CostCenterWhereInput = {
      clientId,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.costCenter.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.costCenter.count({ where }),
    ]);

    return {
      items: items.map(toResponse),
      total,
      limit,
      offset,
    };
  }

  async getById(clientId: string, id: string): Promise<CostCenterResponse> {
    const row = await this.prisma.costCenter.findFirst({
      where: { id, clientId },
    });
    if (!row) {
      throw new NotFoundException('Cost center not found');
    }
    return toResponse(row);
  }

  async create(
    clientId: string,
    dto: CreateCostCenterDto,
    context?: AuditContext,
  ): Promise<CostCenterResponse> {
    const existing = await this.prisma.costCenter.findUnique({
      where: { clientId_code: { clientId, code: dto.code.trim() } },
    });
    if (existing) {
      throw new ConflictException(
        `Cost center with code "${dto.code}" already exists for this client`,
      );
    }

    const created = await this.prisma.costCenter.create({
      data: {
        clientId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'cost_center.created',
      resourceType: 'cost_center',
      resourceId: created.id,
      newValue: {
        id: created.id,
        code: created.code,
        name: created.name,
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
    dto: UpdateCostCenterDto,
    context?: AuditContext,
  ): Promise<CostCenterResponse> {
    const existing = await this.prisma.costCenter.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Cost center not found');
    }

    if (dto.code != null && dto.code.trim() !== existing.code) {
      const conflict = await this.prisma.costCenter.findUnique({
        where: { clientId_code: { clientId, code: dto.code.trim() } },
      });
      if (conflict) {
        throw new ConflictException(
          `Cost center with code "${dto.code}" already exists for this client`,
        );
      }
    }

    const updated = await this.prisma.costCenter.update({
      where: { id },
      data: {
        ...(dto.code != null && { code: dto.code.trim() }),
        ...(dto.name != null && { name: dto.name.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() ?? null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'cost_center.updated',
      resourceType: 'cost_center',
      resourceId: updated.id,
      oldValue: {
        code: existing.code,
        name: existing.name,
        isActive: existing.isActive,
      },
      newValue: {
        code: updated.code,
        name: updated.name,
        isActive: updated.isActive,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return toResponse(updated);
  }
}

function toResponse(
  row: import('@prisma/client').CostCenter,
): CostCenterResponse {
  return {
    id: row.id,
    clientId: row.clientId,
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
