import { Test, TestingModule } from '@nestjs/testing';
import {
  ResourceAclPermission,
  ResourceAclSubjectType,
  RoleScope,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { AccessModelService } from './access-model.service';
import {
  buildClientScopedPermissionMap,
  collectMissingOwnerCandidates,
  userHasAccessModelScopedPermission,
} from './access-model.helpers';
import { collectAtypicalAclIssues } from './access-model-heuristics';

describe('AccessModelService', () => {
  let service: AccessModelService;
  let prisma: {
    project: { count: jest.Mock; findMany: jest.Mock };
    budget: { count: jest.Mock; findMany: jest.Mock };
    budgetLine: { count: jest.Mock; findMany: jest.Mock };
    supplierContract: { count: jest.Mock; findMany: jest.Mock };
    supplier: { count: jest.Mock; findMany: jest.Mock };
    strategicObjective: { count: jest.Mock; findMany: jest.Mock };
    clientUser: { findMany: jest.Mock };
    clientModule: { findMany: jest.Mock };
    userRole: { findMany: jest.Mock };
    resourceAcl: { findMany: jest.Mock; groupBy: jest.Mock };
    resourceAccessPolicy: { findMany: jest.Mock };
    orgUnit: { findMany: jest.Mock };
    orgUnitMembership: { findMany: jest.Mock };
    accessGroupMember: { findMany: jest.Mock };
  };
  let featureFlags: { isEnabled: jest.Mock };

  beforeEach(async () => {
    prisma = {
      project: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      } as {
        count: jest.Mock;
        findMany: jest.Mock;
        findFirst: jest.Mock;
      },
      budget: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      budgetLine: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      supplierContract: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      supplier: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      strategicObjective: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      clientUser: { findMany: jest.fn().mockResolvedValue([]) },
      clientModule: { findMany: jest.fn().mockResolvedValue([{ moduleId: 'mod-budgets' }]) },
      userRole: { findMany: jest.fn().mockResolvedValue([]) },
      resourceAcl: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      resourceAccessPolicy: { findMany: jest.fn().mockResolvedValue([]) },
      orgUnit: { findMany: jest.fn().mockResolvedValue([]) },
      orgUnitMembership: { findMany: jest.fn().mockResolvedValue([]) },
      accessGroupMember: { findMany: jest.fn().mockResolvedValue([]) },
    };
    featureFlags = {
      isEnabled: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessModelService,
        { provide: PrismaService, useValue: prisma },
        { provide: FeatureFlagsService, useValue: featureFlags },
      ],
    }).compile();

    service = module.get(AccessModelService);
  });

  it('getHealth retourne rollout et KPI', async () => {
    const out = await service.getHealth('client-1');
    expect(out.rollout.length).toBeGreaterThan(0);
    expect(out.kpis.resourcesMissingOwner.total).toBe(0);
    expect(featureFlags.isEnabled).toHaveBeenCalled();
  });

  describe('missing_owner BudgetLine', () => {
    it('exclut ligne sans owner si budget parent a une Direction', async () => {
      prisma.budgetLine.findMany.mockResolvedValue([]);
      const items = await collectMissingOwnerCandidates(
        prisma as unknown as PrismaService,
        'client-1',
      );
      expect(items.filter((i) => i.resourceType === 'BUDGET_LINE')).toHaveLength(0);
      expect(prisma.budgetLine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerOrgUnitId: null,
            budget: { ownerOrgUnitId: null },
          }),
        }),
      );
    });

    it('inclut ligne si budget parent aussi sans Direction', async () => {
      prisma.budgetLine.findMany.mockResolvedValue([
        {
          id: 'line-1',
          name: 'Ligne A',
          code: 'L-A',
          budgetId: 'budget-1',
        },
      ]);
      const items = await collectMissingOwnerCandidates(
        prisma as unknown as PrismaService,
        'client-1',
      );
      expect(items.some((i) => i.id === 'line-1' && i.resourceType === 'BUDGET_LINE')).toBe(
        true,
      );
    });
  });

  describe('missing_human permissions', () => {
    it('ignore legacy read seul', async () => {
      const map = new Map<string, Set<string>>([
        ['user-1', new Set(['budgets.read'])],
      ]);
      expect(userHasAccessModelScopedPermission(map, 'user-1')).toBe(false);
    });

    it('détecte read_scope', () => {
      const map = new Map<string, Set<string>>([
        ['user-1', new Set(['budgets.read_scope'])],
      ]);
      expect(userHasAccessModelScopedPermission(map, 'user-1')).toBe(true);
    });

    it('buildClientScopedPermissionMap filtre rôle CLIENT autre client', async () => {
      prisma.userRole.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          role: {
            rolePermissions: [
              {
                permission: {
                  code: 'budgets.read_scope',
                  moduleId: 'mod-budgets',
                  module: { isActive: true },
                },
              },
            ],
          },
        },
      ]);
      const map = await buildClientScopedPermissionMap(
        prisma as unknown as PrismaService,
        'client-active',
        ['user-1'],
      );
      expect(prisma.userRole.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: {
              OR: [
                { scope: RoleScope.CLIENT, clientId: 'client-active' },
                { scope: RoleScope.GLOBAL },
              ],
            },
          }),
        }),
      );
      expect(userHasAccessModelScopedPermission(map, 'user-1')).toBe(true);
    });
  });

  describe('atypical_acl batch', () => {
    it('ne fait pas de findMany dans une boucle par ACL', async () => {
      const manyAcls = Array.from({ length: 5 }, (_, i) => ({
        id: `acl-${i}`,
        clientId: 'client-1',
        resourceType: 'PROJECT',
        resourceId: `proj-${i}`,
        subjectType: ResourceAclSubjectType.USER,
        subjectId: `user-${i}`,
        permission: ResourceAclPermission.WRITE,
      }));
      prisma.resourceAcl.findMany.mockResolvedValue(manyAcls);
      prisma.orgUnit.findMany.mockResolvedValue([
        { id: 'ou-owner', parentId: null },
      ]);
      prisma.project.findMany.mockResolvedValue(
        manyAcls.map((a) => ({
          id: a.resourceId,
          ownerOrgUnitId: 'ou-owner',
        })),
      );
      (prisma.project.findFirst as jest.Mock).mockImplementation(
        async ({ where }: { where: { id: string } }) => ({
          id: where.id,
          clientId: 'client-1',
          name: 'Projet',
          code: 'P-1',
        }),
      );
      prisma.clientUser.findMany.mockResolvedValue(
        manyAcls.map((a) => ({ userId: a.subjectId, resourceId: null })),
      );

      await collectAtypicalAclIssues(prisma as unknown as PrismaService, 'client-1');

      expect(prisma.resourceAcl.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.clientUser.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
