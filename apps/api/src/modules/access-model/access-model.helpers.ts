import {
  BudgetLineStatus,
  BudgetStatus,
  ClientUserStatus,
  ProjectStatus,
  ResourceAclPermission,
  ResourceAclSubjectType,
  RoleScope,
  StrategicObjectiveLifecycleStatus,
  SupplierContractStatus,
  SupplierStatus,
} from '@prisma/client';
import { isAccessModelScopedPermission } from '@starium-orchestra/rbac-permissions';
import type { PrismaService } from '../../prisma/prisma.service';
import type { SupportedDiagnosticResourceType } from '../access-diagnostics/resource-diagnostics.registry';
import { RESOURCE_ACL_RESOURCE_TYPES } from '../access-control/resource-acl.constants';
import type {
  AccessModelCorrectiveAction,
  AccessModelIssueItem,
  OwnerOrgUnitSource,
} from './access-model.types';

export function normalizePage(page?: number): number {
  const p = page ?? 1;
  return Number.isFinite(p) && p >= 1 ? Math.floor(p) : 1;
}

export function normalizeLimit(limit?: number, max = 100): number {
  const l = limit ?? 25;
  if (!Number.isFinite(l) || l < 1) return 25;
  return Math.min(Math.floor(l), max);
}

export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
): { slice: T[]; total: number } {
  const total = items.length;
  const start = (page - 1) * limit;
  return { slice: items.slice(start, start + limit), total };
}

export function matchesSearch(label: string, search?: string): boolean {
  if (!search?.trim()) return true;
  return label.toLowerCase().includes(search.trim().toLowerCase());
}

/** Sous-arbres : pour chaque orgUnitId, ensemble des ids descendants (inclus). */
export async function buildOrgDescendantIndex(
  prisma: PrismaService,
  clientId: string,
): Promise<Map<string, Set<string>>> {
  const units = await prisma.orgUnit.findMany({
    where: { clientId },
    select: { id: true, parentId: true },
  });
  const childrenByParent = new Map<string, string[]>();
  for (const u of units) {
    if (!u.parentId) continue;
    const list = childrenByParent.get(u.parentId) ?? [];
    list.push(u.id);
    childrenByParent.set(u.parentId, list);
  }
  const index = new Map<string, Set<string>>();
  const collect = (rootId: string): Set<string> => {
    const cached = index.get(rootId);
    if (cached) return cached;
    const set = new Set<string>([rootId]);
    for (const child of childrenByParent.get(rootId) ?? []) {
      for (const d of collect(child)) set.add(d);
    }
    index.set(rootId, set);
    return set;
  };
  for (const u of units) collect(u.id);
  return index;
}

export function subjectInOwnerSubtree(
  membershipOrgUnitIds: Iterable<string>,
  ownerOrgUnitId: string,
  descendantIndex: Map<string, Set<string>>,
): boolean {
  const subtree = descendantIndex.get(ownerOrgUnitId);
  if (!subtree) return false;
  for (const ou of membershipOrgUnitIds) {
    if (subtree.has(ou)) return true;
  }
  return false;
}

/**
 * Permissions effectives par user (client actif) — aligné MeService :
 * rôles CLIENT du client + GLOBAL, modules ENABLED uniquement.
 */
export async function buildClientScopedPermissionMap(
  prisma: PrismaService,
  clientId: string,
  userIds: string[],
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  if (userIds.length === 0) return out;

  const enabledClientModules = await prisma.clientModule.findMany({
    where: { clientId, status: 'ENABLED' },
    select: { moduleId: true },
  });
  const enabledModuleIds = new Set(
    enabledClientModules.map((cm) => cm.moduleId),
  );

  const userRoles = await prisma.userRole.findMany({
    where: {
      userId: { in: userIds },
      role: {
        OR: [
          { scope: RoleScope.CLIENT, clientId },
          { scope: RoleScope.GLOBAL },
        ],
      },
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: { include: { module: true } },
            },
          },
        },
      },
    },
  });

  for (const ur of userRoles) {
    const set = out.get(ur.userId) ?? new Set<string>();
    for (const rp of ur.role.rolePermissions) {
      const p = rp.permission;
      if (!p?.code || !p.module) continue;
      if (!p.module.isActive) continue;
      if (!enabledModuleIds.has(p.moduleId)) continue;
      set.add(p.code);
    }
    out.set(ur.userId, set);
  }
  return out;
}

export function userHasAccessModelScopedPermission(
  permissionMap: Map<string, Set<string>>,
  userId: string,
): boolean {
  const codes = permissionMap.get(userId);
  if (!codes) return false;
  for (const code of codes) {
    if (isAccessModelScopedPermission(code)) return true;
  }
  return false;
}

export function correctiveActionForResource(
  resourceType: SupportedDiagnosticResourceType,
  resourceId: string,
  budgetId?: string,
): AccessModelCorrectiveAction {
  switch (resourceType) {
    case 'PROJECT':
      return {
        kind: 'link',
        href: `/projects/${resourceId}`,
        label: 'Ouvrir le projet',
      };
    case 'BUDGET':
      return {
        kind: 'link',
        href: `/budgets/${resourceId}`,
        label: 'Ouvrir le budget',
      };
    case 'BUDGET_LINE':
      return {
        kind: 'link',
        href: `/budgets/${budgetId ?? resourceId}?line=${resourceId}`,
        label: 'Ouvrir la ligne budgétaire',
      };
    case 'CONTRACT':
      return {
        kind: 'link',
        href: `/contracts/${resourceId}`,
        label: 'Ouvrir le contrat',
      };
    case 'SUPPLIER':
      return {
        kind: 'link',
        href: '/suppliers',
        label: 'Voir les fournisseurs',
      };
    case 'STRATEGIC_OBJECTIVE':
      return {
        kind: 'link',
        href: '/strategic-vision',
        label: 'Voir la vision stratégique',
      };
    default:
      return { kind: 'link', href: '/client/administration', label: 'Administration' };
  }
}

export function aclResourceTypeToDiagnostic(
  aclType: string,
): SupportedDiagnosticResourceType | null {
  const t = aclType.toUpperCase();
  if (t === RESOURCE_ACL_RESOURCE_TYPES.PROJECT) return 'PROJECT';
  if (t === RESOURCE_ACL_RESOURCE_TYPES.BUDGET) return 'BUDGET';
  if (t === RESOURCE_ACL_RESOURCE_TYPES.CONTRACT) return 'CONTRACT';
  if (t === RESOURCE_ACL_RESOURCE_TYPES.SUPPLIER) return 'SUPPLIER';
  if (t === RESOURCE_ACL_RESOURCE_TYPES.STRATEGIC_OBJECTIVE) {
    return 'STRATEGIC_OBJECTIVE';
  }
  return null;
}

export const ATYPICAL_ACL_PERMISSIONS = [
  ResourceAclPermission.WRITE,
  ResourceAclPermission.ADMIN,
] as const;

export type MissingOwnerCandidate = {
  id: string;
  resourceType: SupportedDiagnosticResourceType;
  module: string;
  label: string;
  ownerOrgUnitSource?: OwnerOrgUnitSource;
  budgetId?: string;
};

export async function collectMissingOwnerCandidates(
  prisma: PrismaService,
  clientId: string,
): Promise<MissingOwnerCandidate[]> {
  const items: MissingOwnerCandidate[] = [];

  const projects = await prisma.project.findMany({
    where: {
      clientId,
      status: { notIn: [ProjectStatus.ARCHIVED, ProjectStatus.CANCELLED] },
      ownerOrgUnitId: null,
    },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });
  for (const p of projects) {
    items.push({
      id: p.id,
      resourceType: 'PROJECT',
      module: 'projects',
      label: `${p.name} (${p.code})`,
      ownerOrgUnitSource: 'self',
    });
  }

  const budgets = await prisma.budget.findMany({
    where: {
      clientId,
      status: { not: BudgetStatus.ARCHIVED },
      ownerOrgUnitId: null,
    },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });
  for (const b of budgets) {
    items.push({
      id: b.id,
      resourceType: 'BUDGET',
      module: 'budgets',
      label: `${b.name} (${b.code})`,
      ownerOrgUnitSource: 'self',
    });
  }

  const lines = await prisma.budgetLine.findMany({
    where: {
      clientId,
      status: { notIn: [BudgetLineStatus.ARCHIVED, BudgetLineStatus.CLOSED] },
      ownerOrgUnitId: null,
      budget: { ownerOrgUnitId: null },
    },
    select: {
      id: true,
      name: true,
      code: true,
      budgetId: true,
    },
    orderBy: { name: 'asc' },
  });
  for (const l of lines) {
    items.push({
      id: l.id,
      resourceType: 'BUDGET_LINE',
      module: 'budgets',
      label: `${l.name} (${l.code})`,
      ownerOrgUnitSource: 'self',
      budgetId: l.budgetId,
    });
  }

  const contracts = await prisma.supplierContract.findMany({
    where: {
      clientId,
      status: { not: SupplierContractStatus.TERMINATED },
      ownerOrgUnitId: null,
    },
    select: { id: true, title: true, reference: true },
    orderBy: { title: 'asc' },
  });
  for (const c of contracts) {
    items.push({
      id: c.id,
      resourceType: 'CONTRACT',
      module: 'contracts',
      label: c.title ? `${c.title} (${c.reference})` : c.reference,
      ownerOrgUnitSource: 'self',
    });
  }

  const suppliers = await prisma.supplier.findMany({
    where: {
      clientId,
      status: { not: SupplierStatus.ARCHIVED },
      ownerOrgUnitId: null,
    },
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });
  for (const s of suppliers) {
    items.push({
      id: s.id,
      resourceType: 'SUPPLIER',
      module: 'procurement',
      label: s.code ? `${s.name} (${s.code})` : s.name,
      ownerOrgUnitSource: 'self',
    });
  }

  const objectives = await prisma.strategicObjective.findMany({
    where: {
      clientId,
      lifecycleStatus: { not: StrategicObjectiveLifecycleStatus.ARCHIVED },
      ownerOrgUnitId: null,
    },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });
  for (const o of objectives) {
    items.push({
      id: o.id,
      resourceType: 'STRATEGIC_OBJECTIVE',
      module: 'strategic_vision',
      label: o.title,
      ownerOrgUnitSource: 'self',
    });
  }

  return items;
}

export function toMissingOwnerIssue(c: MissingOwnerCandidate): AccessModelIssueItem {
  return {
    id: c.id,
    category: 'missing_owner',
    resourceType: c.resourceType,
    module: c.module,
    label: c.label,
    ownerOrgUnitSource: c.ownerOrgUnitSource,
    severity: 'warning',
    correctiveAction: correctiveActionForResource(
      c.resourceType,
      c.id,
      c.budgetId,
    ),
  };
}

export async function countMissingOwnerByModule(
  prisma: PrismaService,
  clientId: string,
): Promise<{ total: number; byModule: Record<string, number> }> {
  const [projects, budgets, lines, contracts, suppliers, objectives] =
    await Promise.all([
      prisma.project.count({
        where: {
          clientId,
          status: { notIn: [ProjectStatus.ARCHIVED, ProjectStatus.CANCELLED] },
          ownerOrgUnitId: null,
        },
      }),
      prisma.budget.count({
        where: {
          clientId,
          status: { not: BudgetStatus.ARCHIVED },
          ownerOrgUnitId: null,
        },
      }),
      prisma.budgetLine.count({
        where: {
          clientId,
          status: {
            notIn: [BudgetLineStatus.ARCHIVED, BudgetLineStatus.CLOSED],
          },
          ownerOrgUnitId: null,
          budget: { ownerOrgUnitId: null },
        },
      }),
      prisma.supplierContract.count({
        where: {
          clientId,
          status: { not: SupplierContractStatus.TERMINATED },
          ownerOrgUnitId: null,
        },
      }),
      prisma.supplier.count({
        where: {
          clientId,
          status: { not: SupplierStatus.ARCHIVED },
          ownerOrgUnitId: null,
        },
      }),
      prisma.strategicObjective.count({
        where: {
          clientId,
          lifecycleStatus: {
            not: StrategicObjectiveLifecycleStatus.ARCHIVED,
          },
          ownerOrgUnitId: null,
        },
      }),
    ]);

  const byModule: Record<string, number> = {
    projects,
    budgets: budgets + lines,
    contracts,
    procurement: suppliers,
    strategic_vision: objectives,
  };
  const total =
    projects + budgets + lines + contracts + suppliers + objectives;
  return { total, byModule };
}

export async function collectMissingHumanIssues(
  prisma: PrismaService,
  clientId: string,
): Promise<AccessModelIssueItem[]> {
  const members = await prisma.clientUser.findMany({
    where: {
      clientId,
      status: ClientUserStatus.ACTIVE,
      resourceId: null,
    },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { user: { email: 'asc' } },
  });
  if (members.length === 0) return [];

  const userIds = members.map((m) => m.userId);
  const permissionMap = await buildClientScopedPermissionMap(
    prisma,
    clientId,
    userIds,
  );

  const items: AccessModelIssueItem[] = [];
  for (const m of members) {
    if (!userHasAccessModelScopedPermission(permissionMap, m.userId)) continue;
    const name = [m.user.firstName, m.user.lastName].filter(Boolean).join(' ');
    const label = name ? `${name} — ${m.user.email}` : m.user.email;
    items.push({
      id: m.userId,
      category: 'missing_human',
      module: 'organization',
      label,
      subtitle: 'Aucune ressource HUMAN liée',
      severity: 'warning',
      correctiveAction: {
        kind: 'link',
        href: `/client/members?edit=${m.userId}`,
        label: 'Modifier le membre',
      },
    });
  }
  return items;
}
