import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../../audit-logs/audit-logs.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers.query.dto';
import { QuickCreateSupplierDto } from './dto/quick-create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

export interface ProcurementAuditContext {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
}

export interface SupplierResponse {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  siret: string | null;
  vatNumber: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListSuppliersResult {
  items: SupplierResponse[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    query: ListSuppliersQueryDto,
  ): Promise<ListSuppliersResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: any = {
      clientId,
      ...(query.includeArchived ? {} : { status: { not: 'ARCHIVED' } }),
    };
    if (query.search?.trim()) {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const prisma = this.prisma as any;
    const [items, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.supplier.count({ where }),
    ]);

    return { items: items.map(toSupplierResponse), total, limit, offset };
  }

  async create(
    clientId: string,
    dto: CreateSupplierDto,
    context?: ProcurementAuditContext,
  ): Promise<SupplierResponse> {
    const name = normalizeSupplierName(dto.name);
    const prisma = this.prisma as any;
    const existing = await prisma.supplier.findFirst({
      where: { clientId, name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Supplier already exists for this client');
    }

    const created = await prisma.supplier.create({
      data: {
        clientId,
        name,
        code: dto.code?.trim() || null,
        siret: dto.siret?.trim() || null,
        vatNumber: dto.vatNumber?.trim() || null,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier.created',
      resourceType: 'supplier',
      resourceId: created.id,
      newValue: { name: created.name },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return toSupplierResponse(created);
  }

  async quickCreate(
    clientId: string,
    dto: QuickCreateSupplierDto,
    context?: ProcurementAuditContext,
  ): Promise<SupplierResponse> {
    const name = normalizeSupplierName(dto.name);
    const prisma = this.prisma as any;
    const existing = await prisma.supplier.findFirst({
      where: { clientId, name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      return toSupplierResponse(existing);
    }

    const created = await prisma.supplier.create({
      data: {
        clientId,
        name,
        status: 'ACTIVE',
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'supplier.created',
      resourceType: 'supplier',
      resourceId: created.id,
      newValue: {
        name: created.name,
        creationMode: 'QUICK_CREATE',
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return toSupplierResponse(created);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateSupplierDto,
    context?: ProcurementAuditContext,
  ): Promise<SupplierResponse> {
    const prisma = this.prisma as any;
    const existing = await prisma.supplier.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Supplier not found');
    }
    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot update an archived supplier');
    }

    const nextName = dto.name ? normalizeSupplierName(dto.name) : undefined;
    if (nextName && nextName.toLowerCase() !== existing.name.toLowerCase()) {
      const conflict = await prisma.supplier.findFirst({
        where: {
          clientId,
          id: { not: id },
          name: { equals: nextName, mode: 'insensitive' },
        },
      });
      if (conflict) {
        throw new ConflictException('Supplier name already exists for this client');
      }
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(nextName !== undefined && { name: nextName }),
        ...(dto.code !== undefined && { code: dto.code?.trim() || null }),
        ...(dto.siret !== undefined && { siret: dto.siret?.trim() || null }),
        ...(dto.vatNumber !== undefined && { vatNumber: dto.vatNumber?.trim() || null }),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier.updated',
      resourceType: 'supplier',
      resourceId: id,
      oldValue: { name: existing.name },
      newValue: { name: updated.name },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return toSupplierResponse(updated);
  }

  async archive(
    clientId: string,
    id: string,
    context?: ProcurementAuditContext,
  ): Promise<SupplierResponse> {
    const prisma = this.prisma as any;
    const existing = await prisma.supplier.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Supplier not found');
    }
    if (existing.status === 'ARCHIVED') {
      return toSupplierResponse(existing);
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier.archived',
      resourceType: 'supplier',
      resourceId: id,
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return toSupplierResponse(updated);
  }

  async findById(clientId: string, id: string): Promise<SupplierResponse> {
    const prisma = this.prisma as any;
    const row = await prisma.supplier.findFirst({ where: { id, clientId } });
    if (!row) {
      throw new NotFoundException('Supplier not found');
    }
    return toSupplierResponse(row);
  }
}

function normalizeSupplierName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new BadRequestException('Supplier name is required');
  }
  return trimmed;
}

function toSupplierResponse(row: any): SupplierResponse {
  return {
    id: row.id,
    clientId: row.clientId,
    name: row.name,
    code: row.code,
    siret: row.siret,
    vatNumber: row.vatNumber,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

