import type { AccessGroupListItem } from '@/features/access-groups/api/access-groups';
import type { ClientMember } from '@/features/client-rbac/api/user-roles';
import type { ModuleVisibilityMatrixRow } from '@/features/module-visibility/api/module-visibility';

export interface AccessCockpitKpis {
  groupsCount: number;
  totalMembers: number;
  emptyGroupsCount: number;
  modulesWithOverride: number;
  overridesUser: number;
  overridesGroup: number;
  overridesClient: number;
  clientAdmins: number;
  clientUsers: number;
}

export function computeAccessCockpitKpis(input: {
  groups: AccessGroupListItem[] | undefined;
  matrix: ModuleVisibilityMatrixRow[] | undefined;
  members: ClientMember[] | undefined;
}): AccessCockpitKpis {
  const groups = input.groups ?? [];
  const matrix = input.matrix ?? [];
  const members = input.members ?? [];

  const totalMembers = groups.reduce(
    (acc, g) => acc + (g.memberCount ?? 0),
    0,
  );
  const emptyGroupsCount = groups.filter((g) => (g.memberCount ?? 0) === 0)
    .length;

  let overridesUser = 0;
  let overridesGroup = 0;
  let overridesClient = 0;
  let modulesWithOverride = 0;
  for (const row of matrix) {
    if ((row.overrides?.length ?? 0) > 0) modulesWithOverride += 1;
    for (const o of row.overrides ?? []) {
      if (o.scopeType === 'USER') overridesUser += 1;
      else if (o.scopeType === 'GROUP') overridesGroup += 1;
      else if (o.scopeType === 'CLIENT') overridesClient += 1;
    }
  }

  let clientAdmins = 0;
  let clientUsers = 0;
  for (const m of members) {
    if (m.role === 'CLIENT_ADMIN') clientAdmins += 1;
    else if (m.role === 'CLIENT_USER') clientUsers += 1;
  }

  return {
    groupsCount: groups.length,
    totalMembers,
    emptyGroupsCount,
    modulesWithOverride,
    overridesUser,
    overridesGroup,
    overridesClient,
    clientAdmins,
    clientUsers,
  };
}

export function topModulesByOverrides(
  matrix: ModuleVisibilityMatrixRow[] | undefined,
  limit = 5,
): Array<{ moduleCode: string; moduleName: string; count: number }> {
  return (matrix ?? [])
    .map((row) => ({
      moduleCode: row.moduleCode,
      moduleName: row.moduleName,
      count: row.overrides?.length ?? 0,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
