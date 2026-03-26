import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
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
  externalId: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
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
    const supplierRepo = this.getSupplierRepo(prisma);
    const [items, total] = await Promise.all([
      supplierRepo.findMany({
        where,
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      supplierRepo.count({ where }),
    ]);

    return { items: items.map(toSupplierResponse), total, limit, offset };
  }

  async create(
    clientId: string,
    dto: CreateSupplierDto,
    context?: ProcurementAuditContext,
  ): Promise<SupplierResponse> {
    const normalizedName = normalizeSupplierName(dto.name);
    const name = normalizeSupplierDisplayName(dto.name);
    const normalizedVatNumber = normalizeVatNumber(dto.vatNumber);
    const normalizedExternalId = normalizeExternalId(dto.externalId);
    const normalizedEmail = normalizeEmail(dto.email);
    const prisma = this.prisma as any;
    const supplierRepo = this.getSupplierRepo(prisma);
    const existing = await this.findDuplicateSupplierByPriority(supplierRepo, {
      clientId,
      normalizedName,
      vatNumber: normalizedVatNumber,
      externalId: normalizedExternalId,
    });
    this.assertNoCreationConflict(existing);

    let created: any;
    try {
      created = await supplierRepo.create({
        data: {
          clientId,
          name,
          normalizedName,
          code: dto.code?.trim() || null,
          siret: dto.siret?.trim() || null,
          externalId: normalizedExternalId,
          email: normalizedEmail,
          phone: dto.phone?.trim() || null,
          website: dto.website?.trim() || null,
          vatNumber: normalizedVatNumber,
          notes: dto.notes?.trim() || null,
        },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          'Supplier conflict detected (name, externalId or vatNumber)',
        );
      }
      throw error;
    }

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier.created',
      resourceType: 'supplier',
      resourceId: created.id,
      newValue: {
        name: created.name,
        normalizedName: created.normalizedName,
        externalId: created.externalId,
        vatNumber: created.vatNumber,
        creationMode: 'STANDARD',
      },
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
    const normalizedName = normalizeSupplierName(dto.name);
    const name = normalizeSupplierDisplayName(dto.name);
    const normalizedVatNumber = normalizeVatNumber(dto.vatNumber);
    const normalizedExternalId = normalizeExternalId(dto.externalId);
    const normalizedEmail = normalizeEmail(dto.email);
    const prisma = this.prisma as any;
    const supplierRepo = this.getSupplierRepo(prisma);
    const existing = await this.findDuplicateSupplierByPriority(supplierRepo, {
      clientId,
      normalizedName,
      vatNumber: normalizedVatNumber,
      externalId: normalizedExternalId,
    });
    if (existing) {
      if (existing.status === 'ARCHIVED') {
        throw new ConflictException(
          'Supplier match exists but is archived and cannot be reused',
        );
      }
      return toSupplierResponse(existing);
    }

    let created: any;
    try {
      created = await supplierRepo.create({
        data: {
          clientId,
          name,
          normalizedName,
          externalId: normalizedExternalId,
          email: normalizedEmail,
          vatNumber: normalizedVatNumber,
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          'Supplier conflict detected (name, externalId or vatNumber)',
        );
      }
      throw error;
    }

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'supplier.created',
      resourceType: 'supplier',
      resourceId: created.id,
      newValue: {
        name: created.name,
        normalizedName: created.normalizedName,
        externalId: created.externalId,
        vatNumber: created.vatNumber,
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
    const supplierRepo = this.getSupplierRepo(prisma);
    const existing = await supplierRepo.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Supplier not found');
    }
    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot update an archived supplier');
    }

    const nextName = dto.name
      ? normalizeSupplierDisplayName(dto.name)
      : existing.name;
    const nextNormalizedName = dto.name
      ? normalizeSupplierName(dto.name)
      : existing.normalizedName;
    const nextVatNumber =
      dto.vatNumber !== undefined
        ? normalizeVatNumber(dto.vatNumber)
        : existing.vatNumber;
    const nextExternalId =
      dto.externalId !== undefined
        ? normalizeExternalId(dto.externalId)
        : existing.externalId;
    const nextEmail =
      dto.email !== undefined ? normalizeEmail(dto.email) : existing.email;
    const conflict = await this.findDuplicateSupplierByPriority(supplierRepo, {
      clientId,
      normalizedName: nextNormalizedName,
      vatNumber: nextVatNumber,
      externalId: nextExternalId,
      excludeSupplierId: id,
    });
    this.assertNoCreationConflict(conflict);

    let updated: any;
    try {
      updated = await supplierRepo.update({
        where: { id },
        data: {
          name: nextName,
          normalizedName: nextNormalizedName,
          ...(dto.code !== undefined && { code: dto.code?.trim() || null }),
          ...(dto.siret !== undefined && { siret: dto.siret?.trim() || null }),
          ...(dto.externalId !== undefined && { externalId: nextExternalId }),
          ...(dto.email !== undefined && { email: nextEmail }),
          ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
          ...(dto.website !== undefined && { website: dto.website?.trim() || null }),
          ...(dto.vatNumber !== undefined && { vatNumber: nextVatNumber }),
          ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
        },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          'Supplier conflict detected (name, externalId or vatNumber)',
        );
      }
      throw error;
    }

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier.updated',
      resourceType: 'supplier',
      resourceId: id,
      oldValue: {
        name: existing.name,
        normalizedName: existing.normalizedName,
        externalId: existing.externalId ?? null,
        vatNumber: existing.vatNumber ?? null,
      },
      newValue: {
        name: updated.name,
        normalizedName: updated.normalizedName,
        externalId: updated.externalId ?? null,
        vatNumber: updated.vatNumber ?? null,
      },
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
    const supplierRepo = this.getSupplierRepo(prisma);
    const existing = await supplierRepo.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Supplier not found');
    }
    if (existing.status === 'ARCHIVED') {
      return toSupplierResponse(existing);
    }

    const updated = await supplierRepo.update({
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
    const supplierRepo = this.getSupplierRepo(prisma);
    const row = await supplierRepo.findFirst({ where: { id, clientId } });
    if (!row) {
      throw new NotFoundException('Supplier not found');
    }
    return toSupplierResponse(row);
  }

  private getSupplierRepo(prisma: any) {
    const repo = prisma?.supplier ?? prisma?.Supplier;
    if (!repo) {
      throw new InternalServerErrorException(
        'Prisma Client non synchronise avec le schema Supplier. Regenerer/rebuilder l’API.',
      );
    }
    return repo;
  }

  private async findDuplicateSupplierByPriority(
    supplierRepo: any,
    input: {
      clientId: string;
      normalizedName: string;
      externalId?: string | null;
      vatNumber?: string | null;
      excludeSupplierId?: string;
    },
  ): Promise<any | null> {
    const baseWhere = {
      clientId: input.clientId,
      ...(input.excludeSupplierId
        ? { id: { not: input.excludeSupplierId } }
        : {}),
    };

    const externalMatch = input.externalId
      ? await supplierRepo.findFirst({
          where: { ...baseWhere, externalId: input.externalId },
        })
      : null;

    const vatMatch = input.vatNumber
      ? await supplierRepo.findFirst({
          where: { ...baseWhere, vatNumber: input.vatNumber },
        })
      : null;

    if (externalMatch && vatMatch && externalMatch.id !== vatMatch.id) {
      throw new ConflictException(
        'Supplier conflict: externalId and vatNumber match different suppliers',
      );
    }

    if (externalMatch) return externalMatch;
    if (vatMatch) return vatMatch;

    const nameMatch = await supplierRepo.findFirst({
      where: { ...baseWhere, normalizedName: input.normalizedName },
    });
    return nameMatch ?? null;
  }

  private assertNoCreationConflict(conflict: any | null): void {
    if (!conflict) {
      return;
    }
    if (conflict.status === 'ARCHIVED') {
      throw new ConflictException(
        'Supplier match exists but is archived and cannot be reused',
      );
    }
    throw new ConflictException(
      'Supplier already exists for this client (externalId, vatNumber or name)',
    );
  }
}

function normalizeSupplierName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new BadRequestException('Supplier name is required');
  }
  return trimmed.toLowerCase().replace(/\s+/g, ' ');
}

function normalizeSupplierDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new BadRequestException('Supplier name is required');
  }
  return trimmed.replace(/\s+/g, ' ');
}

function normalizeVatNumber(vatNumber?: string | null): string | null {
  if (vatNumber == null) return null;
  const normalized = vatNumber.trim().toUpperCase().replace(/\s+/g, '');
  return normalized || null;
}

function normalizeEmail(email?: string | null): string | null {
  if (email == null) return null;
  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

function normalizeExternalId(externalId?: string | null): string | null {
  if (externalId == null) return null;
  const normalized = externalId.trim();
  return normalized || null;
}

function toSupplierResponse(row: any): SupplierResponse {
  return {
    id: row.id,
    clientId: row.clientId,
    name: row.name,
    code: row.code,
    siret: row.siret,
    vatNumber: row.vatNumber,
    externalId: row.externalId ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    website: row.website ?? null,
    notes: row.notes ?? null,
    status: row.status,
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

