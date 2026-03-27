import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { ProcurementAuditContext } from '../suppliers/suppliers.service';
import { CreateSupplierContactDto } from './dto/create-supplier-contact.dto';
import { ListSupplierContactsQueryDto } from './dto/list-supplier-contacts.query.dto';
import { UpdateSupplierContactDto } from './dto/update-supplier-contact.dto';
import {
  ALLOWED_SUPPLIER_CONTACT_PHOTO_MIME,
  MAX_SUPPLIER_CONTACT_PHOTO_BYTES,
} from './supplier-contacts-photo.constants';
import { SupplierContactsPhotoStorageService } from './supplier-contacts-photo.storage';

export interface SupplierContactResponse {
  id: string;
  clientId: string;
  supplierId: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  normalizedName: string;
  role: string | null;
  email: string | null;
  emailNormalized: string | null;
  phone: string | null;
  mobile: string | null;
  isPrimary: boolean;
  isActive: boolean;
  notes: string | null;
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListSupplierContactsResult {
  items: SupplierContactResponse[];
  total: number;
  limit: number;
  offset: number;
}

/** Contact + nom fournisseur (liste globale client) */
export type SupplierContactListItemResponse = SupplierContactResponse & {
  supplierName: string | null;
};

export interface ListAllSupplierContactsResult {
  items: SupplierContactListItemResponse[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class SupplierContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly photoStorage: SupplierContactsPhotoStorageService,
  ) {}

  async list(
    clientId: string,
    supplierId: string,
    query: ListSupplierContactsQueryDto,
  ): Promise<ListSupplierContactsResult> {
    await this.assertSupplierInClient(clientId, supplierId);

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: Prisma.SupplierContactWhereInput = {
      clientId,
      supplierId,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.search?.trim()
        ? {
            OR: [
              {
                fullName: {
                  contains: query.search.trim(),
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                role: {
                  contains: query.search.trim(),
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                email: {
                  contains: query.search.trim(),
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.supplierContact.findMany({
        where,
        orderBy: [{ isPrimary: 'desc' }, { fullName: 'asc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.supplierContact.count({ where }),
    ]);

    return { items: items.map(toSupplierContactResponse), total, limit, offset };
  }

  /**
   * Liste tous les contacts fournisseurs du client actif (tous fournisseurs),
   * avec le nom du fournisseur pour affichage.
   */
  async listAllForClient(
    clientId: string,
    query: ListSupplierContactsQueryDto,
  ): Promise<ListAllSupplierContactsResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const search = query.search?.trim();

    const where: Prisma.SupplierContactWhereInput = {
      clientId,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(search
        ? {
            OR: [
              {
                fullName: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                role: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                email: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                supplier: {
                  name: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.supplierContact.findMany({
        where,
        include: {
          supplier: {
            select: { name: true },
          },
        },
        orderBy: [{ supplierId: 'asc' }, { isPrimary: 'desc' }, { fullName: 'asc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.supplierContact.count({ where }),
    ]);

    return {
      items: rows.map(toSupplierContactListItemResponse),
      total,
      limit,
      offset,
    };
  }

  async getById(
    clientId: string,
    supplierId: string,
    id: string,
  ): Promise<SupplierContactResponse> {
    const row = await this.findContactOrFail(clientId, supplierId, id);
    return toSupplierContactResponse(row);
  }

  async create(
    clientId: string,
    supplierId: string,
    dto: CreateSupplierContactDto,
    context?: ProcurementAuditContext,
  ): Promise<SupplierContactResponse> {
    await this.assertSupplierInClient(clientId, supplierId);
    const normalized = normalizeContactInputForCreate(dto);

    await this.ensureNoNameConflict(
      clientId,
      supplierId,
      normalized.normalizedName,
      undefined,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      if (normalized.isPrimary) {
        await tx.supplierContact.updateMany({
          where: { clientId, supplierId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      try {
        return await tx.supplierContact.create({
          data: {
            clientId,
            supplierId,
            ...normalized,
          },
        });
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          throw new ConflictException(
            'A contact with the same name already exists for this supplier',
          );
        }
        throw error;
      }
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier_contact.created',
      resourceType: 'supplier_contact',
      resourceId: created.id,
      newValue: {
        supplierId: created.supplierId,
        fullName: created.fullName,
        normalizedName: created.normalizedName,
        email: created.email,
        emailNormalized: created.emailNormalized,
        isPrimary: created.isPrimary,
        isActive: created.isActive,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return toSupplierContactResponse(created);
  }

  async update(
    clientId: string,
    supplierId: string,
    id: string,
    dto: UpdateSupplierContactDto,
    context?: ProcurementAuditContext,
  ): Promise<SupplierContactResponse> {
    const existing = await this.findContactOrFail(clientId, supplierId, id);
    const next = normalizeContactInputForUpdate(existing, dto);

    const targetSupplierId =
      dto.supplierId !== undefined ? dto.supplierId : existing.supplierId;

    if (targetSupplierId !== existing.supplierId) {
      await this.assertSupplierInClient(clientId, targetSupplierId);
    }

    await this.ensureNoNameConflict(clientId, targetSupplierId, next.normalizedName, id);

    const supplierChanged = targetSupplierId !== existing.supplierId;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (next.isPrimary) {
        await tx.supplierContact.updateMany({
          where: {
            clientId,
            supplierId: targetSupplierId,
            isPrimary: true,
            id: { not: id },
          },
          data: { isPrimary: false },
        });
      }

      try {
        const data = {
          ...next,
          ...(supplierChanged ? { supplierId: targetSupplierId } : {}),
        };
        return await tx.supplierContact.update({
          where: { id },
          data,
        });
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          throw new ConflictException(
            'A contact with the same name already exists for this supplier',
          );
        }
        throw error;
      }
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier_contact.updated',
      resourceType: 'supplier_contact',
      resourceId: updated.id,
      oldValue: {
        supplierId: existing.supplierId,
        fullName: existing.fullName,
        normalizedName: existing.normalizedName,
        email: existing.email,
        emailNormalized: existing.emailNormalized,
        isPrimary: existing.isPrimary,
        isActive: existing.isActive,
      },
      newValue: {
        supplierId: updated.supplierId,
        fullName: updated.fullName,
        normalizedName: updated.normalizedName,
        email: updated.email,
        emailNormalized: updated.emailNormalized,
        isPrimary: updated.isPrimary,
        isActive: updated.isActive,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return toSupplierContactResponse(updated);
  }

  async deactivate(
    clientId: string,
    supplierId: string,
    id: string,
    context?: ProcurementAuditContext,
  ): Promise<SupplierContactResponse> {
    const existing = await this.findContactOrFail(clientId, supplierId, id);
    if (!existing.isActive && !existing.isPrimary) {
      return toSupplierContactResponse(existing);
    }

    const updated = await this.prisma.supplierContact.update({
      where: { id },
      data: { isActive: false, isPrimary: false },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier_contact.deactivated',
      resourceType: 'supplier_contact',
      resourceId: updated.id,
      oldValue: {
        isActive: existing.isActive,
        isPrimary: existing.isPrimary,
      },
      newValue: {
        isActive: updated.isActive,
        isPrimary: updated.isPrimary,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return toSupplierContactResponse(updated);
  }

  async savePhoto(
    clientId: string,
    supplierId: string,
    contactId: string,
    file:
      | { buffer: Buffer; mimetype: string; size: number }
      | undefined,
    context?: ProcurementAuditContext,
  ): Promise<{ success: true; photoUrl: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Fichier requis');
    }
    if (file.size > MAX_SUPPLIER_CONTACT_PHOTO_BYTES) {
      throw new BadRequestException('Photo trop volumineuse (max 2 Mo)');
    }
    if (!file.mimetype || !ALLOWED_SUPPLIER_CONTACT_PHOTO_MIME.has(file.mimetype)) {
      throw new BadRequestException('Format accepté : JPEG, PNG, WebP ou GIF');
    }

    await this.findContactOrFail(clientId, supplierId, contactId);
    await this.photoStorage.write(clientId, supplierId, contactId, file.buffer);

    const photoUrl = `/api/suppliers/${supplierId}/contacts/${contactId}/photo`;
    await this.prisma.supplierContact.update({
      where: { id: contactId },
      data: { photoUrl, photoMimeType: file.mimetype } as any,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier_contact.photo_uploaded',
      resourceType: 'supplier_contact',
      resourceId: contactId,
      newValue: { photoMimeType: file.mimetype },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return { success: true, photoUrl };
  }

  async deletePhoto(
    clientId: string,
    supplierId: string,
    contactId: string,
    context?: ProcurementAuditContext,
  ): Promise<{ success: true }> {
    const existing = await this.findContactOrFail(clientId, supplierId, contactId);

    await this.photoStorage.remove(clientId, supplierId, contactId);
    await this.prisma.supplierContact.update({
      where: { id: contactId },
      data: { photoUrl: null, photoMimeType: null } as any,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'supplier_contact.photo_removed',
      resourceType: 'supplier_contact',
      resourceId: contactId,
      oldValue: { photoMimeType: (existing as any).photoMimeType ?? null },
      newValue: { photoMimeType: null },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return { success: true };
  }

  async getPhotoFile(
    clientId: string,
    supplierId: string,
    contactId: string,
  ): Promise<StreamableFile> {
    const existing = await this.findContactOrFail(clientId, supplierId, contactId);
    const mimeType = (existing as any).photoMimeType as string | null | undefined;
    if (!mimeType || !this.photoStorage.exists(clientId, supplierId, contactId)) {
      throw new NotFoundException('Aucune photo');
    }
    const stream = this.photoStorage.createReadStream(clientId, supplierId, contactId);
    return new StreamableFile(stream, { type: mimeType });
  }

  private async assertSupplierInClient(
    clientId: string,
    supplierId: string,
  ): Promise<void> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, clientId },
      select: { id: true },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
  }

  private async findContactOrFail(clientId: string, supplierId: string, id: string) {
    await this.assertSupplierInClient(clientId, supplierId);
    const row = await this.prisma.supplierContact.findFirst({
      where: { id, clientId, supplierId },
    });
    if (!row) {
      throw new NotFoundException('Supplier contact not found');
    }
    return row;
  }

  private async ensureNoNameConflict(
    clientId: string,
    supplierId: string,
    normalizedName: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.prisma.supplierContact.findFirst({
      where: {
        clientId,
        supplierId,
        normalizedName,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException(
        'A contact with the same name already exists for this supplier',
      );
    }
  }
}

function normalizeContactInputForCreate(dto: CreateSupplierContactDto) {
  const firstName = normalizeOptionalText(dto.firstName);
  const lastName = normalizeOptionalText(dto.lastName);
  const fullName = resolveFullName(firstName, lastName, dto.fullName);

  return {
    firstName,
    lastName,
    fullName,
    normalizedName: normalizeName(fullName),
    role: normalizeOptionalText(dto.role),
    email: normalizeEmail(dto.email),
    emailNormalized: normalizeEmail(dto.email),
    phone: normalizeOptionalText(dto.phone),
    mobile: normalizeOptionalText(dto.mobile),
    notes: normalizeOptionalText(dto.notes),
    isPrimary: !!dto.isPrimary,
    isActive: true,
  };
}

function normalizeContactInputForUpdate(
  existing: {
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    notes: string | null;
    isPrimary: boolean;
    isActive: boolean;
  },
  dto: UpdateSupplierContactDto,
) {
  const firstName =
    dto.firstName !== undefined
      ? normalizeOptionalText(dto.firstName)
      : (existing.firstName ?? null);
  const lastName =
    dto.lastName !== undefined
      ? normalizeOptionalText(dto.lastName)
      : (existing.lastName ?? null);
  const payloadFullName = dto.fullName !== undefined ? dto.fullName : existing.fullName;
  const fullName = resolveFullName(firstName, lastName, payloadFullName);

  return {
    firstName,
    lastName,
    fullName,
    normalizedName: normalizeName(fullName),
    role:
      dto.role !== undefined ? normalizeOptionalText(dto.role) : (existing.role ?? null),
    email: dto.email !== undefined ? normalizeEmail(dto.email) : (existing.email ?? null),
    emailNormalized:
      dto.email !== undefined ? normalizeEmail(dto.email) : (existing.email ?? null),
    phone:
      dto.phone !== undefined
        ? normalizeOptionalText(dto.phone)
        : (existing.phone ?? null),
    mobile:
      dto.mobile !== undefined
        ? normalizeOptionalText(dto.mobile)
        : (existing.mobile ?? null),
    notes:
      dto.notes !== undefined
        ? normalizeOptionalText(dto.notes)
        : (existing.notes ?? null),
    isPrimary: dto.isPrimary ?? existing.isPrimary,
    isActive: dto.isActive ?? existing.isActive,
  };
}

function resolveFullName(
  firstName: string | null,
  lastName: string | null,
  payloadFullName?: string,
): string {
  if (firstName || lastName) {
    return [firstName, lastName]
      .filter((part): part is string => !!part)
      .join(' ')
      .trim();
  }
  const fullName = normalizeRequiredText(payloadFullName);
  if (!fullName) {
    throw new BadRequestException('fullName is required');
  }
  return fullName;
}

function normalizeOptionalText(value?: string | null): string | null {
  if (value == null) return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function normalizeRequiredText(value?: string | null): string {
  if (value == null) return '';
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeName(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!normalized) {
    throw new BadRequestException('fullName is required');
  }
  return normalized;
}

function normalizeEmail(value?: string | null): string | null {
  if (value == null) return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function toSupplierContactListItemResponse(
  row: Prisma.SupplierContactGetPayload<{
    include: { supplier: { select: { name: true } } };
  }>,
): SupplierContactListItemResponse {
  return {
    ...toSupplierContactResponse(
      row as unknown as Prisma.SupplierContactGetPayload<Record<string, never>>,
    ),
    supplierName: row.supplier?.name ?? null,
  };
}

function toSupplierContactResponse(
  row: Prisma.SupplierContactGetPayload<Record<string, never>>,
): SupplierContactResponse {
  const rowAny = row as any;
  return {
    id: row.id,
    clientId: row.clientId,
    supplierId: row.supplierId,
    firstName: row.firstName ?? null,
    lastName: row.lastName ?? null,
    fullName: row.fullName,
    normalizedName: row.normalizedName,
    role: row.role ?? null,
    email: row.email ?? null,
    emailNormalized: row.emailNormalized ?? null,
    phone: row.phone ?? null,
    mobile: row.mobile ?? null,
    isPrimary: row.isPrimary,
    isActive: row.isActive,
    notes: row.notes ?? null,
    photoUrl: rowAny.photoUrl ?? null,
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
