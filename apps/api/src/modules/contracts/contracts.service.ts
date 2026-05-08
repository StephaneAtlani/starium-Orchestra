import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  Prisma,
  SupplierContractStatus,
  type SupplierContract,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SuppliersService } from '../procurement/suppliers/suppliers.service';
import { ListSuppliersQueryDto } from '../procurement/suppliers/dto/list-suppliers.query.dto';
import { ContractKindTypesService } from './contract-kind-types.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { ListContractsQueryDto } from './dto/list-contracts.query.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { AccessControlService } from '../access-control/access-control.service';
import { RESOURCE_ACL_RESOURCE_TYPES } from '../access-control/resource-acl.constants';

export interface ContractsAuditContext {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
}

const STATUS_TRANSITIONS: Record<
  SupplierContractStatus,
  ReadonlySet<SupplierContractStatus>
> = {
  [SupplierContractStatus.DRAFT]: new Set([
    SupplierContractStatus.ACTIVE,
    SupplierContractStatus.TERMINATED,
  ]),
  [SupplierContractStatus.ACTIVE]: new Set([
    SupplierContractStatus.SUSPENDED,
    SupplierContractStatus.NOTICE,
    SupplierContractStatus.EXPIRED,
    SupplierContractStatus.TERMINATED,
  ]),
  [SupplierContractStatus.SUSPENDED]: new Set([
    SupplierContractStatus.ACTIVE,
    SupplierContractStatus.NOTICE,
    SupplierContractStatus.EXPIRED,
    SupplierContractStatus.TERMINATED,
  ]),
  [SupplierContractStatus.NOTICE]: new Set([
    SupplierContractStatus.ACTIVE,
    SupplierContractStatus.EXPIRED,
    SupplierContractStatus.TERMINATED,
  ]),
  [SupplierContractStatus.EXPIRED]: new Set([
    SupplierContractStatus.TERMINATED,
    SupplierContractStatus.ACTIVE,
  ]),
  [SupplierContractStatus.TERMINATED]: new Set([]),
};

export interface SupplierSummary {
  id: string;
  name: string;
  code: string | null;
  supplierCategory: { id: string; name: string } | null;
}

export interface ContractResponse {
  id: string;
  clientId: string;
  supplierId: string;
  supplier: SupplierSummary;
  reference: string;
  title: string;
  kind: string;
  kindLabel: string;
  status: string;
  signedAt: Date | null;
  effectiveStart: Date;
  effectiveEnd: Date | null;
  terminatedAt: Date | null;
  renewalMode: string;
  noticePeriodDays: number | null;
  renewalTermMonths: number | null;
  currency: string;
  annualValue: number | null;
  totalCommittedValue: number | null;
  billingFrequency: string | null;
  description: string | null;
  internalNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListContractsResult {
  items: ContractResponse[];
  total: number;
  limit: number;
  offset: number;
}

function decToNumber(v: Prisma.Decimal | null | undefined): number | null {
  if (v == null) return null;
  return Number(v);
}

function toSupplierSummary(row: {
  id: string;
  name: string;
  code: string | null;
  supplierCategory: { id: string; name: string } | null;
}): SupplierSummary {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    supplierCategory: row.supplierCategory,
  };
}

function toContractResponse(
  row: SupplierContract & {
    supplier: {
      id: string;
      name: string;
      code: string | null;
      supplierCategory: { id: string; name: string } | null;
    };
  },
  kindLabel: string,
): ContractResponse {
  return {
    id: row.id,
    clientId: row.clientId,
    supplierId: row.supplierId,
    supplier: toSupplierSummary(row.supplier),
    reference: row.reference,
    title: row.title,
    kind: row.kind,
    kindLabel,
    status: row.status,
    signedAt: row.signedAt,
    effectiveStart: row.effectiveStart,
    effectiveEnd: row.effectiveEnd,
    terminatedAt: row.terminatedAt,
    renewalMode: row.renewalMode,
    noticePeriodDays: row.noticePeriodDays,
    renewalTermMonths: row.renewalTermMonths,
    currency: row.currency,
    annualValue: decToNumber(row.annualValue),
    totalCommittedValue: decToNumber(row.totalCommittedValue),
    billingFrequency: row.billingFrequency,
    description: row.description,
    internalNotes: row.internalNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function assertDateOrder(params: {
  effectiveStart: Date;
  effectiveEnd?: Date | null;
  terminatedAt?: Date | null;
}): void {
  if (
    params.effectiveEnd &&
    params.effectiveEnd.getTime() < params.effectiveStart.getTime()
  ) {
    throw new BadRequestException(
      'La date de fin doit être postérieure ou égale à la date de début',
    );
  }
  if (
    params.terminatedAt &&
    params.terminatedAt.getTime() < params.effectiveStart.getTime()
  ) {
    throw new BadRequestException(
      'La date de résiliation doit être postérieure ou égale à la date de début',
    );
  }
}

function assertStatusTransition(
  from: SupplierContractStatus,
  to: SupplierContractStatus,
): void {
  if (from === to) return;
  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed?.has(to)) {
    throw new UnprocessableEntityException(
      `Transition de statut interdite : ${from} → ${to}`,
    );
  }
}

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly suppliers: SuppliersService,
    private readonly contractKindTypes: ContractKindTypesService,
    @Inject(AccessControlService)
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

  private async assertCanReadContract(clientId: string, userId: string, contractId: string) {
    const allowed = await this.accessControl.canReadResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.CONTRACT,
      resourceId: contractId,
    });
    if (!allowed) throw new ForbiddenException('Accès refusé par ACL ressource');
  }

  private async assertCanWriteContract(clientId: string, userId: string, contractId: string) {
    const allowed = await this.accessControl.canWriteResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.CONTRACT,
      resourceId: contractId,
    });
    if (!allowed) throw new ForbiddenException('Accès refusé par ACL ressource');
  }

  private async assertCanAdminContract(clientId: string, userId: string, contractId: string) {
    const allowed = await this.accessControl.canAdminResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.CONTRACT,
      resourceId: contractId,
    });
    if (!allowed) throw new ForbiddenException('Accès refusé par ACL ressource');
  }

  /**
   * Liste fournisseurs du client pour formulaire / filtres contrats.
   * Droit contracts.* — évite d’exiger procurement.read (ModuleAccessGuard = un module par route).
   */
  listSupplierOptionsForContracts(
    clientId: string,
    query: ListSuppliersQueryDto,
  ) {
    return this.suppliers.list(clientId, query);
  }

  /** Détail minimal fournisseur pour libellés contrats sans procurement.read. */
  getSupplierForContractForm(clientId: string, supplierId: string) {
    return this.suppliers.findById(clientId, supplierId);
  }

  private supplierInclude() {
    return {
      select: {
        id: true,
        name: true,
        code: true,
        supplierCategory: { select: { id: true, name: true } },
      },
    } as const;
  }

  async list(
    clientId: string,
    query: ListContractsQueryDto,
    userId?: string,
  ): Promise<ListContractsResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: Prisma.SupplierContractWhereInput = {
      clientId,
      ...(query.supplierId && { supplierId: query.supplierId }),
      ...(query.status && { status: query.status }),
    };
    if (query.expiresBefore?.trim()) {
      const d = new Date(query.expiresBefore.trim());
      if (!Number.isNaN(d.getTime())) {
        const end = new Date(d);
        end.setUTCHours(23, 59, 59, 999);
        where.effectiveEnd = { lte: end };
      }
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { reference: { contains: term, mode: 'insensitive' } },
        { supplier: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const orderedIds = await this.prisma.supplierContract.findMany({
      where,
      orderBy: [{ effectiveStart: 'desc' }, { createdAt: 'desc' }],
      select: { id: true },
    });
    const readableIds = userId
      ? await this.accessControl.filterReadableResourceIds({
          clientId,
          userId,
          resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.CONTRACT,
          resourceIds: orderedIds.map((row) => row.id),
          operation: 'read',
        })
      : orderedIds.map((row) => row.id);
    const total = readableIds.length;
    const pagedIds = readableIds.slice(offset, offset + limit);
    const rows =
      pagedIds.length === 0
        ? []
        : await this.prisma.supplierContract.findMany({
            where: { clientId, id: { in: pagedIds } },
            include: { supplier: this.supplierInclude() },
          });
    const byId = new Map(rows.map((row) => [row.id, row] as const));

    const kindLabels = await this.contractKindTypes.resolveKindLabels(
      clientId,
      rows.map((r) => r.kind),
    );

    return {
      items: pagedIds
        .map((id) => byId.get(id))
        .filter((row): row is (typeof rows)[number] => Boolean(row))
        .map((r) => toContractResponse(r, kindLabels[r.kind] ?? r.kind)),
      total,
      limit,
      offset,
    };
  }

  async getById(clientId: string, id: string, userId?: string): Promise<ContractResponse> {
    const row = await this.prisma.supplierContract.findFirst({
      where: { id, clientId },
      include: { supplier: this.supplierInclude() },
    });
    if (!row) {
      throw new NotFoundException('Contrat introuvable');
    }
    if (userId) {
      await this.assertCanReadContract(clientId, userId, id);
    }
    const kindLabels = await this.contractKindTypes.resolveKindLabels(
      clientId,
      [row.kind],
    );
    return toContractResponse(row, kindLabels[row.kind] ?? row.kind);
  }

  async create(
    clientId: string,
    dto: CreateContractDto,
    context?: ContractsAuditContext,
  ): Promise<ContractResponse> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, clientId },
      select: { id: true },
    });
    if (!supplier) {
      throw new BadRequestException('Fournisseur introuvable pour ce client');
    }

    const status =
      dto.status ?? SupplierContractStatus.DRAFT;
    const effectiveStart = dto.effectiveStart;
    const effectiveEnd = dto.effectiveEnd ?? null;
    let terminatedAt = dto.terminatedAt ?? null;
    if (status === SupplierContractStatus.TERMINATED && !terminatedAt) {
      terminatedAt = new Date();
    }

    assertDateOrder({ effectiveStart, effectiveEnd, terminatedAt });

    await this.contractKindTypes.assertKindCodeAssignable(clientId, dto.kind);

    try {
      const created = await this.prisma.supplierContract.create({
        data: {
          clientId,
          supplierId: dto.supplierId,
          reference: dto.reference.trim(),
          title: dto.title.trim(),
          kind: dto.kind,
          status,
          signedAt: dto.signedAt ?? null,
          effectiveStart,
          effectiveEnd,
          terminatedAt,
          renewalMode: dto.renewalMode ?? undefined,
          noticePeriodDays: dto.noticePeriodDays ?? null,
          renewalTermMonths: dto.renewalTermMonths ?? null,
          currency: dto.currency.trim().toUpperCase(),
          annualValue:
            dto.annualValue !== undefined && dto.annualValue !== ''
              ? dto.annualValue
              : null,
          totalCommittedValue:
            dto.totalCommittedValue !== undefined &&
            dto.totalCommittedValue !== ''
              ? dto.totalCommittedValue
              : null,
          billingFrequency: dto.billingFrequency?.trim() || null,
          description: dto.description?.trim() || null,
          internalNotes: dto.internalNotes?.trim() || null,
        },
        include: { supplier: this.supplierInclude() },
      });

      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'contract.created',
        resourceType: 'supplier_contract',
        resourceId: created.id,
        newValue: {
          reference: created.reference,
          supplierId: created.supplierId,
          status: created.status,
        },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });

      const kindLabels = await this.contractKindTypes.resolveKindLabels(
        clientId,
        [created.kind],
      );
      return toContractResponse(
        created,
        kindLabels[created.kind] ?? created.kind,
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Une référence de contrat identique existe déjà pour ce client',
        );
      }
      throw e;
    }
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateContractDto,
    context?: ContractsAuditContext,
  ): Promise<ContractResponse> {
    const existing = await this.prisma.supplierContract.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Contrat introuvable');
    }
    if (context?.actorUserId) {
      await this.assertCanWriteContract(clientId, context.actorUserId, id);
    }

    if (dto.supplierId && dto.supplierId !== existing.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, clientId },
        select: { id: true },
      });
      if (!supplier) {
        throw new BadRequestException('Fournisseur introuvable pour ce client');
      }
    }

    const nextStatus =
      dto.status !== undefined ? dto.status : existing.status;
    if (dto.status !== undefined && dto.status !== existing.status) {
      assertStatusTransition(existing.status, dto.status);
    }

    const effectiveStart = dto.effectiveStart ?? existing.effectiveStart;
    const effectiveEnd =
      dto.effectiveEnd !== undefined ? dto.effectiveEnd : existing.effectiveEnd;
    let terminatedAt =
      dto.terminatedAt !== undefined
        ? dto.terminatedAt
        : existing.terminatedAt;

    if (
      nextStatus === SupplierContractStatus.TERMINATED &&
      !terminatedAt
    ) {
      terminatedAt = new Date();
    }

    assertDateOrder({ effectiveStart, effectiveEnd, terminatedAt });

    if (
      dto.kind !== undefined &&
      dto.kind !== existing.kind
    ) {
      await this.contractKindTypes.assertKindCodeAssignable(
        clientId,
        dto.kind,
      );
    }

    const data: Prisma.SupplierContractUpdateInput = {};
    if (dto.supplierId !== undefined) {
      data.supplier = { connect: { id: dto.supplierId } };
    }
    if (dto.reference !== undefined) data.reference = dto.reference.trim();
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.signedAt !== undefined) data.signedAt = dto.signedAt;
    if (dto.effectiveStart !== undefined) data.effectiveStart = dto.effectiveStart;
    if (dto.effectiveEnd !== undefined) data.effectiveEnd = dto.effectiveEnd;
    if (
      dto.terminatedAt !== undefined ||
      terminatedAt?.getTime() !== existing.terminatedAt?.getTime()
    ) {
      data.terminatedAt = terminatedAt;
    }
    if (dto.renewalMode !== undefined) data.renewalMode = dto.renewalMode;
    if (dto.noticePeriodDays !== undefined) {
      data.noticePeriodDays = dto.noticePeriodDays;
    }
    if (dto.renewalTermMonths !== undefined) {
      data.renewalTermMonths = dto.renewalTermMonths;
    }
    if (dto.currency !== undefined) {
      data.currency = dto.currency.trim().toUpperCase();
    }
    if (dto.annualValue !== undefined) {
      data.annualValue =
        dto.annualValue === '' ? null : dto.annualValue;
    }
    if (dto.totalCommittedValue !== undefined) {
      data.totalCommittedValue =
        dto.totalCommittedValue === '' ? null : dto.totalCommittedValue;
    }
    if (dto.billingFrequency !== undefined) {
      data.billingFrequency = dto.billingFrequency?.trim() || null;
    }
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.internalNotes !== undefined) {
      data.internalNotes = dto.internalNotes?.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return this.getById(clientId, id);
    }

    try {
      const updated = await this.prisma.supplierContract.update({
        where: { id },
        data,
        include: { supplier: this.supplierInclude() },
      });

      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'contract.updated',
        resourceType: 'supplier_contract',
        resourceId: id,
        oldValue: {
          status: existing.status,
          reference: existing.reference,
        },
        newValue: {
          status: updated.status,
          reference: updated.reference,
        },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });

      const kindLabels = await this.contractKindTypes.resolveKindLabels(
        clientId,
        [updated.kind],
      );
      return toContractResponse(
        updated,
        kindLabels[updated.kind] ?? updated.kind,
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Une référence de contrat identique existe déjà pour ce client',
        );
      }
      throw e;
    }
  }

  /**
   * Clôture logique : passage à TERMINATED (idempotent si déjà terminé).
   */
  async terminate(
    clientId: string,
    id: string,
    context?: ContractsAuditContext,
  ): Promise<ContractResponse> {
    const existing = await this.prisma.supplierContract.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Contrat introuvable');
    }
    if (context?.actorUserId) {
      await this.assertCanAdminContract(clientId, context.actorUserId, id);
    }
    if (existing.status === SupplierContractStatus.TERMINATED) {
      return this.getById(clientId, id);
    }
    assertStatusTransition(existing.status, SupplierContractStatus.TERMINATED);
    return this.update(
      clientId,
      id,
      {
        status: SupplierContractStatus.TERMINATED,
        terminatedAt: existing.terminatedAt ?? new Date(),
      },
      context,
    );
  }
}
