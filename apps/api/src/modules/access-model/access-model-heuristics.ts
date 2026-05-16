import {
  ResourceAccessPolicyMode,
  ResourceAclSubjectType,
} from '@prisma/client';
import { loadAccessResources } from '../access-decision/access-decision.registry';
import type { PrismaService } from '../../prisma/prisma.service';
import type { SupportedDiagnosticResourceType } from '../access-diagnostics/resource-diagnostics.registry';
import { RESOURCE_DIAGNOSTICS_REGISTRY } from '../access-diagnostics/resource-diagnostics.registry';
import { ATYPICAL_ACL_SCAN_CAP } from './access-model.constants';
import {
  aclResourceTypeToDiagnostic,
  ATYPICAL_ACL_PERMISSIONS,
  buildOrgDescendantIndex,
  correctiveActionForResource,
  subjectInOwnerSubtree,
} from './access-model.helpers';
import type { AccessModelIssueItem } from './access-model.types';

export async function countAtypicalAcl(
  prisma: PrismaService,
  clientId: string,
): Promise<{ total: number; truncated: boolean }> {
  const { items, truncated } = await collectAtypicalAclIssues(prisma, clientId);
  return { total: items.length, truncated };
}

export async function collectAtypicalAclIssues(
  prisma: PrismaService,
  clientId: string,
): Promise<{ items: AccessModelIssueItem[]; truncated: boolean }> {
  const acls = await prisma.resourceAcl.findMany({
    where: {
      clientId,
      permission: { in: [...ATYPICAL_ACL_PERMISSIONS] },
    },
    take: ATYPICAL_ACL_SCAN_CAP + 1,
    orderBy: { updatedAt: 'desc' },
  });
  const truncated = acls.length > ATYPICAL_ACL_SCAN_CAP;
  const slice = truncated ? acls.slice(0, ATYPICAL_ACL_SCAN_CAP) : acls;
  if (slice.length === 0) return { items: [], truncated: false };

  const descendantIndex = await buildOrgDescendantIndex(prisma, clientId);

  const byDiagnostic = new Map<SupportedDiagnosticResourceType, string[]>();
  for (const acl of slice) {
    const diag = aclResourceTypeToDiagnostic(acl.resourceType);
    if (!diag) continue;
    const ids = byDiagnostic.get(diag) ?? [];
    ids.push(acl.resourceId);
    byDiagnostic.set(diag, ids);
  }

  const ownerByKey = new Map<string, string | null>();
  for (const [diag, ids] of byDiagnostic) {
    const map = await loadAccessResources(prisma, {
      clientId,
      resourceType: diag,
      resourceIds: [...new Set(ids)],
    });
    for (const [id, row] of map) {
      ownerByKey.set(`${diag}:${id}`, row.ownerOrgUnitId);
    }
  }

  const userSubjectIds = [
    ...new Set(
      slice
        .filter((a) => a.subjectType === ResourceAclSubjectType.USER)
        .map((a) => a.subjectId),
    ),
  ];
  const groupSubjectIds = [
    ...new Set(
      slice
        .filter((a) => a.subjectType === ResourceAclSubjectType.GROUP)
        .map((a) => a.subjectId),
    ),
  ];

  const clientUsers =
    userSubjectIds.length > 0
      ? await prisma.clientUser.findMany({
          where: { clientId, userId: { in: userSubjectIds } },
          select: { userId: true, resourceId: true },
        })
      : [];

  const groupMembers =
    groupSubjectIds.length > 0
      ? await prisma.accessGroupMember.findMany({
          where: { clientId, groupId: { in: groupSubjectIds } },
          select: { groupId: true, userId: true },
        })
      : [];

  const groupUserIds = [...new Set(groupMembers.map((g) => g.userId))];
  const extraClientUsers =
    groupUserIds.length > 0
      ? await prisma.clientUser.findMany({
          where: { clientId, userId: { in: groupUserIds } },
          select: { userId: true, resourceId: true },
        })
      : [];

  const humanResourceByUser = new Map<string, string | null>();
  for (const cu of [...clientUsers, ...extraClientUsers]) {
    humanResourceByUser.set(cu.userId, cu.resourceId);
  }

  const humanResourceIds = [
    ...new Set(
      [...humanResourceByUser.values()].filter((id): id is string => !!id),
    ),
  ];

  const memberships =
    humanResourceIds.length > 0
      ? await prisma.orgUnitMembership.findMany({
          where: { clientId, resourceId: { in: humanResourceIds } },
          select: { resourceId: true, orgUnitId: true },
        })
      : [];

  const orgUnitsByResource = new Map<string, Set<string>>();
  for (const m of memberships) {
    const set = orgUnitsByResource.get(m.resourceId) ?? new Set<string>();
    set.add(m.orgUnitId);
    orgUnitsByResource.set(m.resourceId, set);
  }

  const groupMembersByGroup = new Map<string, string[]>();
  for (const gm of groupMembers) {
    const list = groupMembersByGroup.get(gm.groupId) ?? [];
    list.push(gm.userId);
    groupMembersByGroup.set(gm.groupId, list);
  }

  const labelCache = new Map<string, string>();
  const resolveLabel = async (
    diag: SupportedDiagnosticResourceType,
    resourceId: string,
  ): Promise<string> => {
    const key = `${diag}:${resourceId}`;
    const cached = labelCache.get(key);
    if (cached) return cached;
    const cfg = RESOURCE_DIAGNOSTICS_REGISTRY[diag];
    const resolved = await cfg.resolveResourceForClient(prisma, {
      clientId,
      resourceId,
    });
    const label = resolved?.label ?? 'Ressource';
    labelCache.set(key, label);
    return label;
  };

  const items: AccessModelIssueItem[] = [];
  const labelPromises: Promise<void>[] = [];

  for (const acl of slice) {
    const diag = aclResourceTypeToDiagnostic(acl.resourceType);
    if (!diag) continue;
    const ownerOrgUnitId = ownerByKey.get(`${diag}:${acl.resourceId}`);
    if (!ownerOrgUnitId) continue;

    let membershipOrgIds: string[] = [];
    if (acl.subjectType === ResourceAclSubjectType.USER) {
      const resId = humanResourceByUser.get(acl.subjectId);
      if (resId) {
        membershipOrgIds = [
          ...(orgUnitsByResource.get(resId) ?? new Set<string>()),
        ];
      }
    } else {
      const userIds = groupMembersByGroup.get(acl.subjectId) ?? [];
      const orgSet = new Set<string>();
      for (const uid of userIds) {
        const resId = humanResourceByUser.get(uid);
        if (!resId) continue;
        for (const ou of orgUnitsByResource.get(resId) ?? []) orgSet.add(ou);
      }
      membershipOrgIds = [...orgSet];
    }

    if (
      subjectInOwnerSubtree(
        membershipOrgIds,
        ownerOrgUnitId,
        descendantIndex,
      )
    ) {
      continue;
    }

    const issueId = `${acl.resourceType}:${acl.resourceId}:${acl.subjectType}:${acl.subjectId}:${acl.permission}`;
    const moduleCode = RESOURCE_DIAGNOSTICS_REGISTRY[diag].moduleCode;
    const placeholderLabel = `${acl.resourceType} — ${acl.permission}`;
    const item: AccessModelIssueItem = {
      id: issueId,
      category: 'atypical_acl',
      resourceType: diag,
      module: moduleCode,
      label: placeholderLabel,
      subtitle: `Partage ${acl.permission} hors périmètre de la Direction propriétaire`,
      severity: 'warning',
      correctiveAction: correctiveActionForResource(diag, acl.resourceId),
    };
    items.push(item);
    labelPromises.push(
      resolveLabel(diag, acl.resourceId).then((label) => {
        item.label = label;
      }),
    );
  }

  await Promise.all(labelPromises);
  items.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  return { items, truncated };
}

export async function countPolicyReviewHints(
  prisma: PrismaService,
  clientId: string,
): Promise<number> {
  const { items } = await collectPolicyReviewIssues(prisma, clientId);
  return items.length;
}

export async function collectPolicyReviewIssues(
  prisma: PrismaService,
  clientId: string,
): Promise<{ items: AccessModelIssueItem[]; truncated: boolean }> {
  const policies = await prisma.resourceAccessPolicy.findMany({
    where: {
      clientId,
      mode: {
        in: [ResourceAccessPolicyMode.RESTRICTIVE, ResourceAccessPolicyMode.SHARING],
      },
    },
  });
  if (policies.length === 0) return { items: [], truncated: false };

  const aclCounts = await prisma.resourceAcl.groupBy({
    by: ['resourceType', 'resourceId'],
    where: { clientId },
    _count: { id: true },
  });
  const aclCountMap = new Map<string, number>();
  for (const row of aclCounts) {
    aclCountMap.set(
      `${row.resourceType}:${row.resourceId}`,
      row._count.id,
    );
  }

  const byDiagnostic = new Map<SupportedDiagnosticResourceType, string[]>();
  for (const p of policies) {
    const count = aclCountMap.get(`${p.resourceType}:${p.resourceId}`) ?? 0;
    if (count > 0) continue;
    const diag = aclResourceTypeToDiagnostic(p.resourceType);
    if (!diag) continue;
    const ids = byDiagnostic.get(diag) ?? [];
    ids.push(p.resourceId);
    byDiagnostic.set(diag, ids);
  }

  const ownerByKey = new Map<string, string | null>();
  for (const [diag, ids] of byDiagnostic) {
    const map = await loadAccessResources(prisma, {
      clientId,
      resourceType: diag,
      resourceIds: [...new Set(ids)],
    });
    for (const [id, row] of map) {
      ownerByKey.set(`${diag}:${id}`, row.ownerOrgUnitId);
    }
  }

  const labelCache = new Map<string, string>();
  const resolveLabel = async (
    diag: SupportedDiagnosticResourceType,
    resourceId: string,
  ): Promise<string> => {
    const key = `${diag}:${resourceId}`;
    const cached = labelCache.get(key);
    if (cached) return cached;
    const cfg = RESOURCE_DIAGNOSTICS_REGISTRY[diag];
    const resolved = await cfg.resolveResourceForClient(prisma, {
      clientId,
      resourceId,
    });
    const label = resolved?.label ?? 'Ressource';
    labelCache.set(key, label);
    return label;
  };

  const items: AccessModelIssueItem[] = [];
  const labelPromises: Promise<void>[] = [];

  for (const p of policies) {
    const count = aclCountMap.get(`${p.resourceType}:${p.resourceId}`) ?? 0;
    if (count > 0) continue;
    const diag = aclResourceTypeToDiagnostic(p.resourceType);
    if (!diag) continue;

    if (p.mode === ResourceAccessPolicyMode.SHARING) {
      const owner = ownerByKey.get(`${diag}:${p.resourceId}`);
      if (!owner) continue;
    }

    const cfg = RESOURCE_DIAGNOSTICS_REGISTRY[diag];
    const severity =
      p.mode === ResourceAccessPolicyMode.RESTRICTIVE ? 'warning' : 'info';
    const subtitle =
      p.mode === ResourceAccessPolicyMode.RESTRICTIVE
        ? 'Politique RESTRICTIVE sans entrée ACL — accès potentiellement bloqué'
        : 'Politique SHARING sans ACL explicite — vérifier le plancher RBAC / scope';

    const item: AccessModelIssueItem = {
      id: `${p.resourceType}:${p.resourceId}:${p.mode}`,
      category: 'policy_review',
      resourceType: diag,
      module: cfg.moduleCode,
      label: p.resourceType,
      subtitle,
      severity,
      correctiveAction: correctiveActionForResource(diag, p.resourceId),
    };
    items.push(item);
    labelPromises.push(
      resolveLabel(diag, p.resourceId).then((label) => {
        item.label = label;
      }),
    );
  }

  await Promise.all(labelPromises);
  items.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  return { items, truncated: false };
}
