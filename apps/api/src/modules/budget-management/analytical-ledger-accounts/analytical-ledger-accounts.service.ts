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
import { CreateAnalyticalLedgerAccountDto } from './dto/create-analytical-ledger-account.dto';
import { ListAnalyticalLedgerAccountsQueryDto } from './dto/list-analytical-ledger-accounts.query.dto';
import { UpdateAnalyticalLedgerAccountDto } from './dto/update-analytical-ledger-account.dto';

export interface AnalyticalLedgerAccountResponse {
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
export class AnalyticalLedgerAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    query: ListAnalyticalLedgerAccountsQueryDto,
  ): Promise<ListResult<AnalyticalLedgerAccountResponse>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: import('@prisma/client').Prisma.AnalyticalLedgerAccountWhereInput = {
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
      this.prisma.analyticalLedgerAccount.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.analyticalLedgerAccount.count({ where }),
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
  ): Promise<AnalyticalLedgerAccountResponse> {
    const row = await this.prisma.analyticalLedgerAccount.findFirst({
      where: { id, clientId },
    });
    if (!row) {
      throw new NotFoundException('Analytical ledger account not found');
    }
    return toResponse(row);
  }

  async create(
    clientId: string,
    dto: CreateAnalyticalLedgerAccountDto,
    context?: AuditContext,
  ): Promise<AnalyticalLedgerAccountResponse> {
    const existing = await this.prisma.analyticalLedgerAccount.findUnique({
      where: { clientId_code: { clientId, code: dto.code.trim() } },
    });
    if (existing) {
      throw new ConflictException(
        `Analytical ledger account with code "${dto.code}" already exists for this client`,
      );
    }

    const created = await this.prisma.analyticalLedgerAccount.create({
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
      action: 'analytical_ledger_account.created',
      resourceType: 'analytical_ledger_account',
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
    dto: UpdateAnalyticalLedgerAccountDto,
    context?: AuditContext,
  ): Promise<AnalyticalLedgerAccountResponse> {
    const existing = await this.prisma.analyticalLedgerAccount.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Analytical ledger account not found');
    }

    if (dto.code != null && dto.code.trim() !== existing.code) {
      const conflict = await this.prisma.analyticalLedgerAccount.findUnique({
        where: { clientId_code: { clientId, code: dto.code.trim() } },
      });
      if (conflict) {
        throw new ConflictException(
          `Analytical ledger account with code "${dto.code}" already exists for this client`,
        );
      }
    }

    const updated = await this.prisma.analyticalLedgerAccount.update({
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
      action: 'analytical_ledger_account.updated',
      resourceType: 'analytical_ledger_account',
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
  row: import('@prisma/client').AnalyticalLedgerAccount,
): AnalyticalLedgerAccountResponse {
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
