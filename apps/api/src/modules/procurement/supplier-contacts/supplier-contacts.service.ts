import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { ProcurementAuditContext } from '../suppliers/suppliers.service';
import { CreateSupplierContactDto } from './dto/create-supplier-contact.dto';
import { ListSupplierContactsQueryDto } from './dto/list-supplier-contacts.query.dto';
import { UpdateSupplierContactDto } from './dto/update-supplier-contact.dto';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface ListSupplierContactsResult {
  items: SupplierContactResponse[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class SupplierContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
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

    await this.ensureNoNameConflict(clientId, supplierId, next.normalizedName, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (next.isPrimary) {
        await tx.supplierContact.updateMany({
          where: { clientId, supplierId, isPrimary: true, id: { not: id } },
          data: { isPrimary: false },
        });
      }

      try {
        return await tx.supplierContact.update({
          where: { id },
          data: next,
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
        fullName: existing.fullName,
        normalizedName: existing.normalizedName,
        email: existing.email,
        emailNormalized: existing.emailNormalized,
        isPrimary: existing.isPrimary,
        isActive: existing.isActive,
      },
      newValue: {
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

function toSupplierContactResponse(
  row: Prisma.SupplierContactGetPayload<Record<string, never>>,
): SupplierContactResponse {
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
