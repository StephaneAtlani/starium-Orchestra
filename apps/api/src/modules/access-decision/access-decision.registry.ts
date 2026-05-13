import type { PrismaService } from '../../prisma/prisma.service';
import type { SupportedDiagnosticResourceType } from '../access-diagnostics/resource-diagnostics.registry';
import type { AccessResourceScopeRow } from './access-decision.types';

/**
 * RFC-ACL-018 — charge `ownerOrgUnitId` (+ hints OWN) en **un** `findMany` par type.
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

  const row = (id: string, ownerOrgUnitId: string | null): void => {
    out.set(id, {
      ownerOrgUnitId,
      ownHints: { subjectResourceId: null },
    });
  };

  switch (params.resourceType) {
    case 'PROJECT': {
      const rows = await prisma.project.findMany({
        where: { clientId: params.clientId, id: { in: ids } },
        select: { id: true, ownerOrgUnitId: true },
      });
      for (const r of rows) {
        row(r.id, r.ownerOrgUnitId);
      }
      break;
    }
    case 'BUDGET': {
      const rows = await prisma.budget.findMany({
        where: { clientId: params.clientId, id: { in: ids } },
        select: { id: true, ownerOrgUnitId: true },
      });
      for (const r of rows) {
        row(r.id, r.ownerOrgUnitId);
      }
      break;
    }
    case 'CONTRACT': {
      const rows = await prisma.supplierContract.findMany({
        where: { clientId: params.clientId, id: { in: ids } },
        select: { id: true, ownerOrgUnitId: true },
      });
      for (const r of rows) {
        row(r.id, r.ownerOrgUnitId);
      }
      break;
    }
    case 'SUPPLIER': {
      const rows = await prisma.supplier.findMany({
        where: { clientId: params.clientId, id: { in: ids } },
        select: { id: true, ownerOrgUnitId: true },
      });
      for (const r of rows) {
        row(r.id, r.ownerOrgUnitId);
      }
      break;
    }
    case 'STRATEGIC_OBJECTIVE': {
      const rows = await prisma.strategicObjective.findMany({
        where: { clientId: params.clientId, id: { in: ids } },
        select: { id: true, ownerOrgUnitId: true },
      });
      for (const r of rows) {
        row(r.id, r.ownerOrgUnitId);
      }
      break;
    }
  }

  return out;
}
