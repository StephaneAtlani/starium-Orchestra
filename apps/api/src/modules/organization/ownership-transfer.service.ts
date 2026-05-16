import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuditContext } from '../budget-management/types/audit-context';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { assertOrgUnitInClient, orgUnitAuditRef } from './org-unit-ownership.helpers';
import { ORGANIZATION_AUDIT } from './organization-audit.constants';
import {
  buildOwnershipTransferWhere,
  type OwnershipTransferResourceType,
} from './ownership-transfer-resource-types';

type PreviewItem = { id: string; label: string };

type TypePreview = {
  resourceType: OwnershipTransferResourceType;
  count: number;
  items: PreviewItem[];
  page: number;
  limit: number;
};

export type OwnershipTransferResult = {
  dryRun: boolean;
  applied: boolean;
  fromOrgUnitId: string;
  toOrgUnitId: string;
  countsByType: Record<string, number>;
  previews: TypePreview[];
};

@Injectable()
export class OwnershipTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async transfer(
    clientId: string,
    dto: TransferOwnershipDto,
    context?: AuditContext,
  ): Promise<OwnershipTransferResult> {
    const fromOrgUnitId = dto.fromOrgUnitId.trim();
    const toOrgUnitId = dto.toOrgUnitId.trim();

    if (fromOrgUnitId === toOrgUnitId) {
      throw new BadRequestException('Les unités source et cible doivent être différentes');
    }

    await assertOrgUnitInClient(this.prisma, clientId, fromOrgUnitId);
    await assertOrgUnitInClient(this.prisma, clientId, toOrgUnitId);

    if (!dto.dryRun && dto.confirmApply !== true) {
      throw new BadRequestException(
        'Le transfert effectif exige confirmApply: true (après un dry-run).',
      );
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 50;
    const skip = (page - 1) * limit;

    const countsByType: Record<string, number> = {};
    const previews: TypePreview[] = [];

    for (const resourceType of dto.resourceTypes) {
      const where = buildOwnershipTransferWhere(resourceType, clientId, fromOrgUnitId);
      const count = await this.countByType(resourceType, where as never);
      countsByType[resourceType] = count;

      const rows = await this.findPreviewByType(resourceType, where as never, skip, limit);
      previews.push({
        resourceType,
        count,
        items: rows,
        page,
        limit,
      });
    }

    if (dto.dryRun) {
      return {
        dryRun: true,
        applied: false,
        fromOrgUnitId,
        toOrgUnitId,
        countsByType,
        previews,
      };
    }

    let totalUpdated = 0;
    for (const resourceType of dto.resourceTypes) {
      const where = buildOwnershipTransferWhere(resourceType, clientId, fromOrgUnitId);
      const updated = await this.updateManyByType(resourceType, where as never, toOrgUnitId);
      totalUpdated += updated;
    }

    const [fromRef, toRef] = await Promise.all([
      orgUnitAuditRef(this.prisma, clientId, fromOrgUnitId),
      orgUnitAuditRef(this.prisma, clientId, toOrgUnitId),
    ]);

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: ORGANIZATION_AUDIT.OWNERSHIP_BATCH_TRANSFERRED,
      resourceType: 'organization_ownership_transfer',
      resourceId: fromOrgUnitId,
      oldValue: { from: fromRef, countsByType },
      newValue: { to: toRef, totalUpdated, countsByType },
      ...context?.meta,
    });

    return {
      dryRun: false,
      applied: true,
      fromOrgUnitId,
      toOrgUnitId,
      countsByType,
      previews,
    };
  }

  private async countByType(
    type: OwnershipTransferResourceType,
    where: never,
  ): Promise<number> {
    switch (type) {
      case 'PROJECT':
        return this.prisma.project.count({ where });
      case 'BUDGET':
        return this.prisma.budget.count({ where });
      case 'BUDGET_LINE':
        return this.prisma.budgetLine.count({ where });
      case 'SUPPLIER':
        return this.prisma.supplier.count({ where });
      case 'CONTRACT':
        return this.prisma.supplierContract.count({ where });
      case 'STRATEGIC_OBJECTIVE':
        return this.prisma.strategicObjective.count({ where });
      default: {
        const _exhaustive: never = type;
        return _exhaustive;
      }
    }
  }

  private async findPreviewByType(
    type: OwnershipTransferResourceType,
    where: never,
    skip: number,
    take: number,
  ): Promise<PreviewItem[]> {
    const selectLabel = { id: true, name: true, title: true, code: true, reference: true };

    switch (type) {
      case 'PROJECT': {
        const rows = await this.prisma.project.findMany({
          where,
          skip,
          take,
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' },
        });
        return rows.map((r) => ({
          id: r.id,
          label: r.code ? `${r.name} (${r.code})` : r.name,
        }));
      }
      case 'BUDGET': {
        const rows = await this.prisma.budget.findMany({
          where,
          skip,
          take,
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' },
        });
        return rows.map((r) => ({
          id: r.id,
          label: r.code ? `${r.name} (${r.code})` : r.name,
        }));
      }
      case 'BUDGET_LINE': {
        const rows = await this.prisma.budgetLine.findMany({
          where,
          skip,
          take,
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' },
        });
        return rows.map((r) => ({
          id: r.id,
          label: r.code ? `${r.name} (${r.code})` : r.name,
        }));
      }
      case 'SUPPLIER': {
        const rows = await this.prisma.supplier.findMany({
          where,
          skip,
          take,
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' },
        });
        return rows.map((r) => ({
          id: r.id,
          label: r.code ? `${r.name} (${r.code})` : r.name,
        }));
      }
      case 'CONTRACT': {
        const rows = await this.prisma.supplierContract.findMany({
          where,
          skip,
          take,
          select: { id: true, title: true, reference: true },
          orderBy: { reference: 'asc' },
        });
        return rows.map((r) => ({
          id: r.id,
          label: `${r.reference} — ${r.title}`,
        }));
      }
      case 'STRATEGIC_OBJECTIVE': {
        const rows = await this.prisma.strategicObjective.findMany({
          where,
          skip,
          take,
          select: { id: true, title: true },
          orderBy: { title: 'asc' },
        });
        return rows.map((r) => ({ id: r.id, label: r.title }));
      }
      default: {
        const _exhaustive: never = type;
        return _exhaustive;
      }
    }
  }

  private async updateManyByType(
    type: OwnershipTransferResourceType,
    where: never,
    toOrgUnitId: string,
  ): Promise<number> {
    const data = { ownerOrgUnitId: toOrgUnitId };

    switch (type) {
      case 'PROJECT': {
        const res = await this.prisma.project.updateMany({ where, data });
        return res.count;
      }
      case 'BUDGET': {
        const res = await this.prisma.budget.updateMany({ where, data });
        return res.count;
      }
      case 'BUDGET_LINE': {
        const res = await this.prisma.budgetLine.updateMany({ where, data });
        return res.count;
      }
      case 'SUPPLIER': {
        const res = await this.prisma.supplier.updateMany({ where, data });
        return res.count;
      }
      case 'CONTRACT': {
        const res = await this.prisma.supplierContract.updateMany({ where, data });
        return res.count;
      }
      case 'STRATEGIC_OBJECTIVE': {
        const res = await this.prisma.strategicObjective.updateMany({
          where,
          data,
        });
        return res.count;
      }
      default: {
        const _exhaustive: never = type;
        return _exhaustive;
      }
    }
  }
}
