import { describe, expect, it } from 'vitest';
import {
  computeAccessCockpitKpis,
  topModulesByOverrides,
} from './aggregate';
import type { AccessGroupListItem } from '@/features/access-groups/api/access-groups';
import type { ClientMember } from '@/features/client-rbac/api/user-roles';
import type { ModuleVisibilityMatrixRow } from '@/features/module-visibility/api/module-visibility';

describe('access-cockpit aggregate', () => {
  it('computes counts from groups, matrix and members', () => {
    const groups: AccessGroupListItem[] = [
      { id: 'g1', name: 'DAF', memberCount: 3, createdAt: '', updatedAt: '' },
      { id: 'g2', name: 'PMO', memberCount: 0, createdAt: '', updatedAt: '' },
    ];
    const matrix: ModuleVisibilityMatrixRow[] = [
      {
        moduleCode: 'budgets',
        moduleName: 'Budgets',
        overrides: [
          {
            id: 'o1',
            scopeType: 'GROUP',
            scopeId: 'g1',
            visibility: 'HIDDEN',
            scopeLabel: 'DAF',
          },
          {
            id: 'o2',
            scopeType: 'USER',
            scopeId: 'u1',
            visibility: 'HIDDEN',
            scopeLabel: 'jean@test.fr',
          },
        ],
      },
      {
        moduleCode: 'projects',
        moduleName: 'Projets',
        overrides: [
          {
            id: 'o3',
            scopeType: 'CLIENT',
            scopeId: null,
            visibility: 'HIDDEN',
            scopeLabel: 'Client',
          },
        ],
      },
      {
        moduleCode: 'contracts',
        moduleName: 'Contrats',
        overrides: [],
      },
    ];
    const members: ClientMember[] = [
      {
        id: 'u1',
        email: 'a@test.fr',
        firstName: 'A',
        lastName: 'Z',
        role: 'CLIENT_ADMIN',
        status: 'ACTIVE',
        humanResourceSummary: null,
      },
      {
        id: 'u2',
        email: 'b@test.fr',
        firstName: 'B',
        lastName: 'Z',
        role: 'CLIENT_USER',
        status: 'ACTIVE',
        humanResourceSummary: null,
      },
      {
        id: 'u3',
        email: 'c@test.fr',
        firstName: 'C',
        lastName: 'Z',
        role: 'CLIENT_USER',
        status: 'ACTIVE',
        humanResourceSummary: null,
      },
    ];

    const kpis = computeAccessCockpitKpis({ groups, matrix, members });
    expect(kpis).toEqual({
      groupsCount: 2,
      totalMembers: 3,
      emptyGroupsCount: 1,
      modulesWithOverride: 2,
      overridesUser: 1,
      overridesGroup: 1,
      overridesClient: 1,
      clientAdmins: 1,
      clientUsers: 2,
    });
  });

  it('sorts top modules by override count desc', () => {
    const matrix: ModuleVisibilityMatrixRow[] = [
      {
        moduleCode: 'a',
        moduleName: 'A',
        overrides: [
          {
            id: 'o',
            scopeType: 'USER',
            scopeId: 'u',
            visibility: 'HIDDEN',
            scopeLabel: 'u',
          },
        ],
      },
      {
        moduleCode: 'b',
        moduleName: 'B',
        overrides: [
          {
            id: 'o',
            scopeType: 'USER',
            scopeId: 'u',
            visibility: 'HIDDEN',
            scopeLabel: 'u',
          },
          {
            id: 'o2',
            scopeType: 'USER',
            scopeId: 'u',
            visibility: 'HIDDEN',
            scopeLabel: 'u',
          },
          {
            id: 'o3',
            scopeType: 'USER',
            scopeId: 'u',
            visibility: 'HIDDEN',
            scopeLabel: 'u',
          },
        ],
      },
      { moduleCode: 'c', moduleName: 'C', overrides: [] },
    ];
    const top = topModulesByOverrides(matrix, 5);
    expect(top.map((row) => row.moduleCode)).toEqual(['b', 'a']);
  });
});
