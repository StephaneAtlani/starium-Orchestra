import type { PrismaService } from '../../prisma/prisma.service';
import type { SupportedDiagnosticResourceType } from '../access-diagnostics/resource-diagnostics.registry';
import type { AccessResourceScopeRow } from './access-decision.types';

/**
 * RFC-ACL-018 / RFC-ACL-020 — charge `ownerOrgUnitId` effectif + `aclResourceType` /
 * `aclResourceId` (peut différer du resourceType métier — cas `BUDGET_LINE` qui hérite
 * de l'ACL du Budget parent).
 */
export async function loadAccessResources(
  prisma: PrismaService,
  params: {
    clientId: string;
    resourceType: SupportedDiagnosticResourceType;
    resourceIds: string[];
  },
): Promise<Map<string, AccessResourceScopeRow>> {
  const ids = [...new Set(params.resourceIds.filter(Boolean))];
  const out = new Map<string, AccessResourceScopeRow>();
  if (ids.length === 0) {
    return out;
  }

  switch (params.resourceType) {
    case 'PROJECT': {
      const rows = await prisma.project.findMany({
        where: { clientId: params.clientId, id: { in: ids } },
        select: { id: true, ownerOrgUnitId: true },
      });
      for (const r of rows) {
        out.set(r.id, {
          ownerOrgUnitId: r.ownerOrgUnitId,
          ownerOrgUnitSource: 'self',
          aclResourceType: 'PROJECT',
          aclResourceId: r.id,
          ownHints: { subjectResourceId: null },
        });
      }
      break;
    }
    case 'BUDGET': {
      const rows = await prisma.budget.findMany({
        where: { clientId: params.clientId, id: { in: ids } },
        select: { id: true, ownerOrgUnitId: true },
      });
      for (const r of rows) {
        out.set(r.id, {
          ownerOrgUnitId: r.ownerOrgUnitId,
          ownerOrgUnitSource: 'self',
          aclResourceType: 'BUDGET',
          aclResourceId: r.id,
          ownHints: { subjectResourceId: null },
        });
      }
      break;
    }
    case 'BUDGET_LINE': {
      const rows = await prisma.budgetLine.findMany({
        where: { clientId: params.clientId, id: { in: ids } },
        select: {
          id: true,
          budgetId: true,
          ownerOrgUnitId: true,
          budget: { select: { ownerOrgUnitId: true } },
        },
      });
      for (const r of rows) {
        const effectiveOwner =
          r.ownerOrgUnitId ?? r.budget?.ownerOrgUnitId ?? null;
        out.set(r.id, {
          ownerOrgUnitId: effectiveOwner,
          ownerOrgUnitSource: r.ownerOrgUnitId ? 'self' : 'parent',
          aclResourceType: 'BUDGET',
          aclResourceId: r.budgetId,
          ownHints: { subjectResourceId: null },
        });
      }
      break;
    }
    case 'CONTRACT': {
      const rows = await prisma.supplierContract.findMany({
        where: { clientId: params.clientId, id: { in: ids } },
        select: { id: true, ownerOrgUnitId: true },
      });
      for (const r of rows) {
        out.set(r.id, {
          ownerOrgUnitId: r.ownerOrgUnitId,
          ownerOrgUnitSource: 'self',
          aclResourceType: 'CONTRACT',
          aclResourceId: r.id,
          ownHints: { subjectResourceId: null },
        });
      }
      break;
    }
    case 'SUPPLIER': {
      const rows = await prisma.supplier.findMany({
        where: { clientId: params.clientId, id: { in: ids } },
        select: { id: true, ownerOrgUnitId: true },
      });
      for (const r of rows) {
        out.set(r.id, {
          ownerOrgUnitId: r.ownerOrgUnitId,
          ownerOrgUnitSource: 'self',
          aclResourceType: 'SUPPLIER',
          aclResourceId: r.id,
          ownHints: { subjectResourceId: null },
        });
      }
      break;
    }
    case 'STRATEGIC_OBJECTIVE': {
      const rows = await prisma.strategicObjective.findMany({
        where: { clientId: params.clientId, id: { in: ids } },
        select: { id: true, ownerOrgUnitId: true },
      });
      for (const r of rows) {
        out.set(r.id, {
          ownerOrgUnitId: r.ownerOrgUnitId,
          ownerOrgUnitSource: 'self',
          aclResourceType: 'STRATEGIC_OBJECTIVE',
          aclResourceId: r.id,
          ownHints: { subjectResourceId: null },
        });
      }
      break;
    }
  }

  return out;
}
