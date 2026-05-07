import type { PrismaService } from '../../prisma/prisma.service';
import { RESOURCE_ACL_RESOURCE_TYPES } from '../access-control/resource-acl.constants';
import type { EffectiveRightsOperation } from './access-diagnostics.types';

export type SupportedDiagnosticResourceType =
  | 'PROJECT'
  | 'BUDGET'
  | 'CONTRACT'
  | 'SUPPLIER'
  | 'STRATEGIC_OBJECTIVE';

export type ResolvedDiagnosticResource = {
  id: string;
  clientId: string;
  label: string;
};

type PermissionByOperation = Record<EffectiveRightsOperation, string | null>;

export type ResourceDiagnosticsConfig = {
  resourceType: SupportedDiagnosticResourceType;
  moduleCode: string;
  moduleVisibilityScope: string;
  aclResourceType: keyof typeof RESOURCE_ACL_RESOURCE_TYPES;
  permissions: PermissionByOperation;
  resolveResourceForClient: (
    prisma: PrismaService,
    params: { clientId: string; resourceId: string },
  ) => Promise<ResolvedDiagnosticResource | null>;
};

export const RESOURCE_DIAGNOSTICS_REGISTRY: Record<
  SupportedDiagnosticResourceType,
  ResourceDiagnosticsConfig
> = {
  PROJECT: {
    resourceType: 'PROJECT',
    moduleCode: 'projects',
    moduleVisibilityScope: 'projects',
    aclResourceType: 'PROJECT',
    permissions: {
      read: 'projects.read',
      write: 'projects.update',
      admin: 'projects.delete',
    },
    async resolveResourceForClient(prisma, params) {
      const row = await prisma.project.findFirst({
        where: { id: params.resourceId, clientId: params.clientId },
        select: { id: true, clientId: true, name: true, code: true },
      });
      if (!row) return null;
      return { id: row.id, clientId: row.clientId, label: `${row.name} (${row.code})` };
    },
  },
  BUDGET: {
    resourceType: 'BUDGET',
    moduleCode: 'budgets',
    moduleVisibilityScope: 'budgets',
    aclResourceType: 'BUDGET',
    permissions: {
      read: 'budgets.read',
      write: 'budgets.update',
      admin: null,
    },
    async resolveResourceForClient(prisma, params) {
      const row = await prisma.budget.findFirst({
        where: { id: params.resourceId, clientId: params.clientId },
        select: { id: true, clientId: true, name: true, code: true },
      });
      if (!row) return null;
      return { id: row.id, clientId: row.clientId, label: `${row.name} (${row.code})` };
    },
  },
  CONTRACT: {
    resourceType: 'CONTRACT',
    moduleCode: 'contracts',
    moduleVisibilityScope: 'contracts',
    aclResourceType: 'CONTRACT',
    permissions: {
      read: 'contracts.read',
      write: 'contracts.update',
      admin: 'contracts.delete',
    },
    async resolveResourceForClient(prisma, params) {
      const row = await prisma.supplierContract.findFirst({
        where: { id: params.resourceId, clientId: params.clientId },
        select: { id: true, clientId: true, title: true, reference: true },
      });
      if (!row) return null;
      return {
        id: row.id,
        clientId: row.clientId,
        label: `${row.title} (${row.reference})`,
      };
    },
  },
  SUPPLIER: {
    resourceType: 'SUPPLIER',
    moduleCode: 'procurement',
    moduleVisibilityScope: 'procurement',
    aclResourceType: 'SUPPLIER',
    permissions: {
      read: 'procurement.read',
      write: 'procurement.update',
      admin: null,
    },
    async resolveResourceForClient(prisma, params) {
      const row = await prisma.supplier.findFirst({
        where: { id: params.resourceId, clientId: params.clientId },
        select: { id: true, clientId: true, name: true, code: true },
      });
      if (!row) return null;
      return {
        id: row.id,
        clientId: row.clientId,
        label: row.code ? `${row.name} (${row.code})` : row.name,
      };
    },
  },
  STRATEGIC_OBJECTIVE: {
    resourceType: 'STRATEGIC_OBJECTIVE',
    moduleCode: 'strategic_vision',
    moduleVisibilityScope: 'strategic_vision',
    aclResourceType: 'STRATEGIC_OBJECTIVE',
    permissions: {
      read: 'strategic_vision.read',
      write: 'strategic_vision.update',
      admin: 'strategic_vision.delete',
    },
    async resolveResourceForClient(prisma, params) {
      const row = await prisma.strategicObjective.findFirst({
        where: { id: params.resourceId, clientId: params.clientId },
        select: { id: true, clientId: true, title: true },
      });
      if (!row) return null;
      return { id: row.id, clientId: row.clientId, label: row.title };
    },
  },
};

export function getResourceDiagnosticsConfig(
  resourceType: string,
): ResourceDiagnosticsConfig | null {
  if (
    resourceType !== 'PROJECT' &&
    resourceType !== 'BUDGET' &&
    resourceType !== 'CONTRACT' &&
    resourceType !== 'SUPPLIER' &&
    resourceType !== 'STRATEGIC_OBJECTIVE'
  ) {
    return null;
  }
  return RESOURCE_DIAGNOSTICS_REGISTRY[resourceType];
}
