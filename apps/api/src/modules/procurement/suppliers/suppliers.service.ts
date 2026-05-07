import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
  StreamableFile,
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
import {
  ALLOWED_SUPPLIER_LOGO_MIME,
  MAX_SUPPLIER_LOGO_BYTES,
} from './suppliers-logo.constants';
import { SuppliersLogoStorageService } from './suppliers-logo.storage';
import { AccessControlService } from '../../access-control/access-control.service';
import { RESOURCE_ACL_RESOURCE_TYPES } from '../../access-control/resource-acl.constants';

export interface ProcurementAuditContext {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
}

export interface SupplierCategorySummary {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  icon: string | null;
  isActive: boolean;
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
  logoUrl: string | null;
  notes: string | null;
  status: string;
  supplierCategoryId: string | null;
  supplierCategory: SupplierCategorySummary | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListSuppliersResult {
  items: SupplierResponse[];
  total: number;
  limit: number;
  offset: number;
}

/** Agrégats lecture seule pour GET /suppliers/dashboard (périmètre client actif). */
export interface SuppliersDashboardStats {
  suppliersListed: number;
  suppliersArchived: number;
  purchaseOrdersCount: number;
  invoicesCount: number;
  contactsActiveCount: number;
}

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly logoStorage: SuppliersLogoStorageService,
    private readonly accessControl: Pick<
      AccessControlService,
      'canReadResource' | 'canWriteResource' | 'canAdminResource' | 'filterReadableResourceIds'
    > = {
      canReadResource: async () => true,
      canWriteResource: async () => true,
      canAdminResource: async () => true,
      filterReadableResourceIds: async (params) => params.resourceIds,
    },
  ) {}

  private async assertCanReadSupplier(clientId: string, userId: string, supplierId: string) {
    const allowed = await this.accessControl.canReadResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.SUPPLIER,
      resourceId: supplierId,
    });
    if (!allowed) throw new ForbiddenException('Accès refusé par ACL ressource');
  }

  private async assertCanWriteSupplier(clientId: string, userId: string, supplierId: string) {
    const allowed = await this.accessControl.canWriteResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.SUPPLIER,
      resourceId: supplierId,
    });
    if (!allowed) throw new ForbiddenException('Accès refusé par ACL ressource');
  }

  private async assertCanAdminSupplier(clientId: string, userId: string, supplierId: string) {
    const allowed = await this.accessControl.canAdminResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.SUPPLIER,
      resourceId: supplierId,
    });
    if (!allowed) throw new ForbiddenException('Accès refusé par ACL ressource');
  }

  async getDashboardStats(clientId: string): Promise<SuppliersDashboardStats> {
    const prisma = this.prisma as any;
    const supplierRepo = this.getSupplierRepo(prisma);
    const [
      suppliersListed,
      suppliersArchived,
      purchaseOrdersCount,
      invoicesCount,
      contactsActiveCount,
    ] = await Promise.all([
      supplierRepo.count({
        where: { clientId, status: { not: 'ARCHIVED' } },
      }),
      supplierRepo.count({
        where: { clientId, status: 'ARCHIVED' },
      }),
      prisma.purchaseOrder.count({ where: { clientId } }),
      prisma.invoice.count({ where: { clientId } }),
      prisma.supplierContact.count({
        where: { clientId, isActive: true },
      }),
    ]);
    return {
      suppliersListed,
      suppliersArchived,
      purchaseOrdersCount,
      invoicesCount,
      contactsActiveCount,
    };
  }

  async list(
    clientId: string,
    query: ListSuppliersQueryDto,
    userId?: string,
  ): Promise<ListSuppliersResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: any = {
      clientId,
      ...(query.includeArchived ? {} : { status: { not: 'ARCHIVED' } }),
      ...(query.supplierCategoryId
        ? { supplierCategoryId: query.supplierCategoryId }
        : {}),
    };
    if (query.search?.trim()) {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const prisma = this.prisma as any;
    const supplierRepo = this.getSupplierRepo(prisma);
    const orderedIds = await supplierRepo.findMany({
      where,
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      select: { id: true },
    });
    const readableIds = userId
      ? await this.accessControl.filterReadableResourceIds({
          clientId,
          userId,
          resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.SUPPLIER,
          resourceIds: orderedIds.map((row: { id: string }) => row.id),
          operation: 'read',
        })
      : orderedIds.map((row: { id: string }) => row.id);
    const total = readableIds.length;
    const pagedIds = readableIds.slice(offset, offset + limit);
    const items =
      pagedIds.length === 0
        ? []
        : await supplierRepo.findMany({
            where: { clientId, id: { in: pagedIds } },
            include: { supplierCategory: true },
          });
    const byId = new Map(items.map((item: (typeof items)[number]) => [item.id, item]));
    const orderedItems = pagedIds
      .map((id: string) => byId.get(id))
      .filter(
        (item: (typeof items)[number] | undefined): item is (typeof items)[number] =>
          Boolean(item),
      );

    return { items: orderedItems.map(toSupplierResponse), total, limit, offset };
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
      include: {
        supplierCategory: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Supplier not found');
    }
    if (context?.actorUserId) {
      await this.assertCanWriteSupplier(clientId, context.actorUserId, id);
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
    const nextSupplierCategoryId = await this.resolveSupplierCategoryId(
      clientId,
      dto.supplierCategoryId,
    );
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
          ...(dto.supplierCategoryId !== undefined && {
            supplierCategoryId: nextSupplierCategoryId,
          }),
        },
        include: {
          supplierCategory: true,
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
        supplierCategoryId: existing.supplierCategoryId ?? null,
      },
      newValue: {
        name: updated.name,
        normalizedName: updated.normalizedName,
        externalId: updated.externalId ?? null,
        vatNumber: updated.vatNumber ?? null,
        supplierCategoryId: updated.supplierCategoryId ?? null,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    if (
      dto.supplierCategoryId !== undefined &&
      (existing.supplierCategoryId ?? null) !== (updated.supplierCategoryId ?? null)
    ) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: updated.supplierCategoryId
          ? 'supplier.category_assigned'
          : 'supplier.category_removed',
        resourceType: 'supplier',
        resourceId: id,
        oldValue: { supplierCategoryId: existing.supplierCategoryId ?? null },
        newValue: { supplierCategoryId: updated.supplierCategoryId ?? null },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

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
    if (context?.actorUserId) {
      await this.assertCanAdminSupplier(clientId, context.actorUserId, id);
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

  async saveLogo(
    clientId: string,
    supplierId: string,
    file:
      | { buffer: Buffer; mimetype: string; size: number }
      | undefined,
    context?: ProcurementAuditContext,
  ): Promise<{ success: true; logoUrl: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Fichier requis');
    }
    if (file.size > MAX_SUPPLIER_LOGO_BYTES) {
      throw new BadRequestException('Logo trop volumineux (max 2 Mo)');
    }
    if (!file.mimetype || !ALLOWED_SUPPLIER_LOGO_MIME.has(file.mimetype)) {
      throw new BadRequestException('Format accepté : JPEG, PNG, WebP ou GIF');
    }

    const supplierRepo = this.getSupplierRepo(this.prisma as any);
    const existing = await supplierRepo.findFirst({
      where: { id: supplierId, clientId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Supplier not found');
    }
    if (context?.actorUserId) {
      await this.assertCanWriteSupplier(clientId, context.actorUserId, supplierId);
    }

    await this.logoStorage.write(clientId, supplierId, file.buffer);
    const logoUrl = `/api/suppliers/${supplierId}/logo`;
    await supplierRepo.update({
      where: { id: supplierId },
      data: { logoUrl, logoMimeType: file.mimetype },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier.logo_uploaded',
      resourceType: 'supplier',
      resourceId: supplierId,
      newValue: { logoMimeType: file.mimetype },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return { success: true, logoUrl };
  }

  async deleteLogo(
    clientId: string,
    supplierId: string,
    context?: ProcurementAuditContext,
  ): Promise<{ success: true }> {
    const supplierRepo = this.getSupplierRepo(this.prisma as any);
    const existing = await supplierRepo.findFirst({
      where: { id: supplierId, clientId },
      select: { id: true, logoMimeType: true },
    });
    if (!existing) {
      throw new NotFoundException('Supplier not found');
    }
    if (context?.actorUserId) {
      await this.assertCanAdminSupplier(clientId, context.actorUserId, supplierId);
    }

    await this.logoStorage.remove(clientId, supplierId);
    await supplierRepo.update({
      where: { id: supplierId },
      data: { logoUrl: null, logoMimeType: null },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier.logo_removed',
      resourceType: 'supplier',
      resourceId: supplierId,
      oldValue: { logoMimeType: existing.logoMimeType ?? null },
      newValue: { logoMimeType: null },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return { success: true };
  }

  async getLogoFile(
    clientId: string,
    supplierId: string,
    userId?: string,
  ): Promise<StreamableFile> {
    if (userId) {
      await this.assertCanReadSupplier(clientId, userId, supplierId);
    }
    const supplierRepo = this.getSupplierRepo(this.prisma as any);
    const existing = await supplierRepo.findFirst({
      where: { id: supplierId, clientId },
      select: { logoMimeType: true },
    });
    if (
      !existing?.logoMimeType ||
      !this.logoStorage.exists(clientId, supplierId)
    ) {
      throw new NotFoundException('Aucun logo');
    }
    const stream = this.logoStorage.createReadStream(clientId, supplierId);
    return new StreamableFile(stream, { type: existing.logoMimeType });
  }

  async findById(clientId: string, id: string, userId?: string): Promise<SupplierResponse> {
    const prisma = this.prisma as any;
    const supplierRepo = this.getSupplierRepo(prisma);
    const row = await supplierRepo.findFirst({ where: { id, clientId } });
    if (!row) {
      throw new NotFoundException('Supplier not found');
    }
    if (userId) {
      await this.assertCanReadSupplier(clientId, userId, id);
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

  private async resolveSupplierCategoryId(
    clientId: string,
    supplierCategoryId: string | null | undefined,
  ): Promise<string | null | undefined> {
    if (supplierCategoryId === undefined) {
      return undefined;
    }

    const normalizedId = supplierCategoryId?.trim() || null;
    if (!normalizedId) {
      return null;
    }

    const category = await this.prisma.supplierCategory.findFirst({
      where: { id: normalizedId, clientId },
      select: { id: true, isActive: true },
    });
    if (!category) {
      throw new BadRequestException('Supplier category not found');
    }
    if (!category.isActive) {
      throw new BadRequestException('Supplier category is inactive');
    }
    return normalizedId;
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
  const supplierCategory = row.supplierCategory
    ? {
        id: row.supplierCategory.id,
        name: row.supplierCategory.name,
        code: row.supplierCategory.code ?? null,
        color: row.supplierCategory.color ?? null,
        icon: row.supplierCategory.icon ?? null,
        isActive: row.supplierCategory.isActive,
      }
    : null;

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
    logoUrl: row.logoUrl ?? null,
    notes: row.notes ?? null,
    status: row.status,
    supplierCategoryId: row.supplierCategoryId ?? null,
    supplierCategory,
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

