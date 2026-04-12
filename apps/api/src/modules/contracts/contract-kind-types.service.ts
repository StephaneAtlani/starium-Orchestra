import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { CreateContractKindTypeDto } from './dto/create-contract-kind-type.dto';
import { UpdateContractKindTypeDto } from './dto/update-contract-kind-type.dto';
import {
  ContractKindTypeItem,
  ContractKindTypeScope,
} from './types/contract-kind-type.types';

export interface ContractKindTypeAuditContext {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
}

function toItem(row: {
  id: string;
  clientId: string | null;
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ContractKindTypeItem {
  const scope: ContractKindTypeScope = row.clientId ? 'client' : 'global';
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    scope,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function rowPriority(r: { clientId: string | null; isActive: boolean }): number {
  let p = 0;
  if (r.clientId) p += 4;
  if (r.isActive) p += 2;
  return p;
}

@Injectable()
export class ContractKindTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /** Catalogue pour sélecteurs : globaux actifs + types client actifs. */
  async listMergedForClient(clientId: string): Promise<ContractKindTypeItem[]> {
    const [globalRows, clientRows] = await Promise.all([
      this.prisma.supplierContractKindType.findMany({
        where: { clientId: null, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      }),
      this.prisma.supplierContractKindType.findMany({
        where: { clientId, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      }),
    ]);
    return [
      ...globalRows.map((r) => toItem(r)),
      ...clientRows.map((r) => toItem(r)),
    ];
  }

  /**
   * Libellés d’affichage pour des codes (contrats existants) : préfère actif, puis client, puis global.
   */
  async resolveKindLabels(
    clientId: string,
    codes: string[],
  ): Promise<Record<string, string>> {
    const unique = [...new Set(codes.filter((c) => c && c.length > 0))];
    if (unique.length === 0) return {};
    const rows = await this.prisma.supplierContractKindType.findMany({
      where: {
        code: { in: unique },
        OR: [{ clientId: null }, { clientId }],
      },
    });
    const best = new Map<string, { label: string; prio: number }>();
    for (const r of rows) {
      const p = rowPriority(r);
      const cur = best.get(r.code);
      if (!cur || p > cur.prio) {
        best.set(r.code, { label: r.label, prio: p });
      }
    }
    const out: Record<string, string> = {};
    for (const c of unique) {
      out[c] = best.get(c)?.label ?? c;
    }
    return out;
  }

  async assertKindCodeAssignable(clientId: string, code: string): Promise<void> {
    const row = await this.prisma.supplierContractKindType.findFirst({
      where: {
        code,
        isActive: true,
        OR: [{ clientId: null }, { clientId }],
      },
    });
    if (!row) {
      throw new BadRequestException(
        'Type de contrat invalide ou désactivé pour ce client',
      );
    }
  }

  async createForClient(
    clientId: string,
    dto: CreateContractKindTypeDto,
    context?: ContractKindTypeAuditContext,
  ): Promise<ContractKindTypeItem> {
    const globalDup = await this.prisma.supplierContractKindType.findFirst({
      where: { clientId: null, code: dto.code, isActive: true },
    });
    if (globalDup) {
      throw new BadRequestException(
        `Le code « ${dto.code} » est déjà utilisé par un type plateforme actif`,
      );
    }
    try {
      const row = await this.prisma.supplierContractKindType.create({
        data: {
          clientId,
          code: dto.code,
          label: dto.label,
          description: dto.description ?? null,
          sortOrder: dto.sortOrder ?? 0,
          isActive: true,
        },
      });
      await this.auditKindType('supplier_contract_kind_type.created', {
        clientId,
        userId: context?.actorUserId,
        resourceId: row.id,
        newValue: { code: row.code, label: row.label, scope: 'client' },
        meta: context?.meta,
      });
      return toItem(row);
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          `Un type avec le code « ${dto.code} » existe déjà pour ce client`,
        );
      }
      throw e;
    }
  }

  async updateForClient(
    clientId: string,
    id: string,
    dto: UpdateContractKindTypeDto,
    context?: ContractKindTypeAuditContext,
  ): Promise<ContractKindTypeItem> {
    const existing = await this.prisma.supplierContractKindType.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Type de contrat introuvable');
    }
    if (dto.code !== undefined && dto.code !== existing.code) {
      const globalDup = await this.prisma.supplierContractKindType.findFirst({
        where: { clientId: null, code: dto.code, isActive: true },
      });
      if (globalDup) {
        throw new BadRequestException(
          `Le code « ${dto.code} » est déjà utilisé par un type plateforme actif`,
        );
      }
    }
    try {
      const row = await this.prisma.supplierContractKindType.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
      await this.auditKindType('supplier_contract_kind_type.updated', {
        clientId,
        userId: context?.actorUserId,
        resourceId: row.id,
        newValue: { code: row.code, label: row.label, isActive: row.isActive },
        meta: context?.meta,
      });
      return toItem(row);
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          `Un type avec le code « ${dto.code ?? existing.code} » existe déjà pour ce client`,
        );
      }
      throw e;
    }
  }

  async softDeleteForClient(
    clientId: string,
    id: string,
    context?: ContractKindTypeAuditContext,
  ): Promise<ContractKindTypeItem> {
    return this.updateForClient(clientId, id, { isActive: false }, context);
  }

  private async auditKindType(
    action: string,
    input: {
      clientId: string;
      userId?: string;
      resourceId: string;
      newValue: Record<string, unknown>;
      meta?: ContractKindTypeAuditContext['meta'];
    },
  ): Promise<void> {
    const auditInput: CreateAuditLogInput = {
      clientId: input.clientId,
      userId: input.userId,
      action,
      resourceType: 'supplier_contract_kind_type',
      resourceId: input.resourceId,
      newValue: input.newValue,
      ipAddress: input.meta?.ipAddress,
      userAgent: input.meta?.userAgent,
      requestId: input.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);
  }
}
