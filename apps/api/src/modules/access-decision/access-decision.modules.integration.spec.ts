/**
 * RFC-ACL-020 — §7.1 Matrice anti-fuite paramétrée par module.
 *
 * Pour chacun des modules branchés sur le moteur (PROJECT, BUDGET, CONTRACT,
 * SUPPLIER, STRATEGIC_OBJECTIVE, BUDGET_LINE), on rejoue les 12 scénarios
 * obligatoires du plan. La suite ne couvre pas la bascule legacy/V2 (testée
 * dans chaque service métier) ni la persistance Prisma (testée en intégration
 * réelle) — uniquement l'invariant moteur : « jamais d'allow inter-direction
 * ni inter-client par accident ».
 */
import {
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserStatus,
} from '@prisma/client';
import { AccessDecisionService } from './access-decision.service';
import type { SupportedDiagnosticResourceType } from '../access-diagnostics/resource-diagnostics.registry';
import type { RequestWithClient } from '../../common/types/request-with-client';

const RID = 'caaaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_RID = 'cbbbbbbbbbbbbbbbbbbbbbbbbb';

type ModuleCfg = {
  resourceType: SupportedDiagnosticResourceType;
  moduleCode: string;
  permRead: string;
  permReadScope: string;
  permReadAll: string;
  permWriteScope: string;
  permManageAll: string;
  /** Setup prisma findMany sur le bon modèle pour cette ressource (owner = `ou-X`). */
  setupPrismaOwner: (prisma: any, ownerOrgUnitId: string | null) => void;
};

const MODULES: ReadonlyArray<ModuleCfg> = [
  {
    resourceType: 'PROJECT',
    moduleCode: 'projects',
    permRead: 'projects.read',
    permReadScope: 'projects.read_scope',
    permReadAll: 'projects.read_all',
    permWriteScope: 'projects.write_scope',
    permManageAll: 'projects.manage_all',
    setupPrismaOwner: (prisma, owner) => {
      prisma.project = {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: RID, ownerOrgUnitId: owner }]),
      };
    },
  },
  {
    resourceType: 'BUDGET',
    moduleCode: 'budgets',
    permRead: 'budgets.read',
    permReadScope: 'budgets.read_scope',
    permReadAll: 'budgets.read_all',
    permWriteScope: 'budgets.write_scope',
    permManageAll: 'budgets.manage_all',
    setupPrismaOwner: (prisma, owner) => {
      prisma.budget = {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: RID, ownerOrgUnitId: owner }]),
      };
    },
  },
  {
    resourceType: 'CONTRACT',
    moduleCode: 'contracts',
    permRead: 'contracts.read',
    permReadScope: 'contracts.read_scope',
    permReadAll: 'contracts.read_all',
    permWriteScope: 'contracts.write_scope',
    permManageAll: 'contracts.manage_all',
    setupPrismaOwner: (prisma, owner) => {
      prisma.supplierContract = {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: RID, ownerOrgUnitId: owner }]),
      };
    },
  },
  {
    resourceType: 'SUPPLIER',
    moduleCode: 'procurement',
    permRead: 'procurement.read',
    permReadScope: 'procurement.read_scope',
    permReadAll: 'procurement.read_all',
    permWriteScope: 'procurement.write_scope',
    permManageAll: 'procurement.manage_all',
    setupPrismaOwner: (prisma, owner) => {
      prisma.supplier = {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: RID, ownerOrgUnitId: owner }]),
      };
    },
  },
  {
    resourceType: 'STRATEGIC_OBJECTIVE',
    moduleCode: 'strategic_vision',
    permRead: 'strategic_vision.read',
    permReadScope: 'strategic_vision.read_scope',
    permReadAll: 'strategic_vision.read_all',
    permWriteScope: 'strategic_vision.write_scope',
    permManageAll: 'strategic_vision.manage_all',
    setupPrismaOwner: (prisma, owner) => {
      prisma.strategicObjective = {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: RID, ownerOrgUnitId: owner }]),
      };
    },
  },
];

describe('RFC-ACL-020 §7.1 — matrice anti-fuite paramétrée', () => {
  const clientId = 'cclientclientclientclientc';
  const userId = 'cuseruseruseruseruseruseru';
  const request = {} as RequestWithClient;

  function makeService() {
    const effectivePermissions = {
      resolvePermissionCodesForRequest: jest
        .fn()
        .mockResolvedValue(new Set<string>()),
    };
    const organizationScope = {
      resolveOrgScope: jest.fn().mockResolvedValue({
        level: 'NONE',
        reasonCodes: ['SCOPE_OUT_OF_SUBTREE'],
      }),
    };
    const moduleVisibility = {
      isVisibleForUser: jest.fn().mockResolvedValue(true),
    };
    const accessControl = {
      evaluateResourceAccess: jest.fn().mockResolvedValue({
        allowed: true,
        reasonCode: 'POLICY_DEFAULT_NO_ACL_PUBLIC',
        effectiveAccessMode: 'PUBLIC_DEFAULT',
        aclRank: 0,
        mode: 'DEFAULT',
      }),
      evaluateResourceAccessBatch: jest.fn(),
    };
    const prisma: any = {
      clientUser: {
        findFirst: jest.fn().mockResolvedValue({
          status: ClientUserStatus.ACTIVE,
          licenseType: ClientUserLicenseType.READ_WRITE,
          licenseEndsAt: null,
          licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
          subscriptionId: null,
          subscription: null,
        }),
      },
      module: { findFirst: jest.fn().mockResolvedValue({ id: 'mod-1' }) },
    };
    const service = new AccessDecisionService(
      prisma,
      effectivePermissions as any,
      organizationScope as any,
      moduleVisibility as any,
      accessControl as any,
    );
    return { service, prisma, effectivePermissions, organizationScope, accessControl };
  }

  describe.each(MODULES)('module %s', (mod) => {
    it('#1 write_scope X tente PATCH ressource Y (même client) → refus ACCESS_DENIED_ORG_SCOPE', async () => {
      const { service, prisma, effectivePermissions, organizationScope } = makeService();
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set([mod.permWriteScope]),
      );
      organizationScope.resolveOrgScope.mockResolvedValue({
        level: 'NONE',
        reasonCodes: ['SCOPE_OUT_OF_SUBTREE'],
      });
      mod.setupPrismaOwner(prisma, 'ou-Y');

      const d = await service.decide({
        request,
        clientId,
        userId,
        resourceType: mod.resourceType,
        resourceId: RID,
        intent: 'write',
      });

      expect(d.allowed).toBe(false);
      expect(d.reasonCodes).toContain('ACCESS_DENIED_ORG_SCOPE');
    });

    it('#2 write_scope X PATCH ressource X → allow ACCESS_ALLOWED_BY_WRITE_SCOPE', async () => {
      const { service, prisma, effectivePermissions, organizationScope } = makeService();
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set([mod.permWriteScope]),
      );
      organizationScope.resolveOrgScope.mockResolvedValue({
        level: 'SCOPE',
        reasonCodes: ['SCOPE_IN_SUBTREE'],
      });
      mod.setupPrismaOwner(prisma, 'ou-X');

      const d = await service.decide({
        request,
        clientId,
        userId,
        resourceType: mod.resourceType,
        resourceId: RID,
        intent: 'write',
      });

      expect(d.allowed).toBe(true);
      expect(d.reasonCodes).toContain('ACCESS_ALLOWED_BY_WRITE_SCOPE');
    });

    it('#3 manage_all PATCH quelconque → allow ACCESS_ALLOWED_BY_MANAGE_ALL', async () => {
      const { service, prisma, effectivePermissions, organizationScope } = makeService();
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set([mod.permManageAll]),
      );
      organizationScope.resolveOrgScope.mockResolvedValue({
        level: 'ALL',
        reasonCodes: ['ALL_RBAC_OVERRIDE'],
      });
      mod.setupPrismaOwner(prisma, 'ou-Y');

      const d = await service.decide({
        request,
        clientId,
        userId,
        resourceType: mod.resourceType,
        resourceId: RID,
        intent: 'write',
      });

      expect(d.allowed).toBe(true);
      expect(d.reasonCodes).toContain('ACCESS_ALLOWED_BY_MANAGE_ALL');
    });

    it('#4 read_scope + ownerOrgUnitId null → refus MISSING_OWNER_ORG_UNIT', async () => {
      const { service, prisma, effectivePermissions } = makeService();
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set([mod.permReadScope]),
      );
      mod.setupPrismaOwner(prisma, null);

      const d = await service.decide({
        request,
        clientId,
        userId,
        resourceType: mod.resourceType,
        resourceId: RID,
        intent: 'read',
      });

      expect(d.allowed).toBe(false);
      expect(d.reasonCodes).toContain('MISSING_OWNER_ORG_UNIT');
    });

    it('#5 read_all + ownerOrgUnitId null → autorisé', async () => {
      const { service, prisma, effectivePermissions, organizationScope } = makeService();
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set([mod.permReadAll]),
      );
      organizationScope.resolveOrgScope.mockResolvedValue({
        level: 'ALL',
        reasonCodes: ['ALL_RBAC_OVERRIDE'],
      });
      mod.setupPrismaOwner(prisma, null);

      const d = await service.decide({
        request,
        clientId,
        userId,
        resourceType: mod.resourceType,
        resourceId: RID,
        intent: 'read',
      });

      expect(d.allowed).toBe(true);
    });

    it('#6 SHARING + ACL match + SANS RBAC intent → refus', async () => {
      const { service, prisma, effectivePermissions, accessControl } = makeService();
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set<string>(),
      );
      accessControl.evaluateResourceAccess.mockResolvedValue({
        allowed: true,
        reasonCode: 'POLICY_SHARING_ACL_MATCH',
        effectiveAccessMode: 'SHARING_ACL_PLUS_FLOOR',
        aclRank: 1,
        mode: 'SHARING',
      });
      mod.setupPrismaOwner(prisma, 'ou-X');

      const d = await service.decide({
        request,
        clientId,
        userId,
        resourceType: mod.resourceType,
        resourceId: RID,
        intent: 'write',
      });

      expect(d.allowed).toBe(false);
      expect(d.reasonCodes).toContain('ACCESS_DENIED_RBAC');
    });

    it('#7 SHARING + ACL match + RBAC intent OK + org NONE (read) → allow ACCESS_ALLOWED_BY_SHARING_ACL', async () => {
      const { service, prisma, effectivePermissions, organizationScope, accessControl } =
        makeService();
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set([mod.permReadScope]),
      );
      organizationScope.resolveOrgScope.mockResolvedValue({
        level: 'NONE',
        reasonCodes: ['SCOPE_OUT_OF_SUBTREE'],
      });
      accessControl.evaluateResourceAccess.mockResolvedValue({
        allowed: true,
        reasonCode: 'POLICY_SHARING_ACL_MATCH',
        effectiveAccessMode: 'SHARING_ACL_PLUS_FLOOR',
        aclRank: 1,
        mode: 'SHARING',
      });
      mod.setupPrismaOwner(prisma, 'ou-Y');

      const d = await service.decide({
        request,
        clientId,
        userId,
        resourceType: mod.resourceType,
        resourceId: RID,
        intent: 'read',
      });

      expect(d.allowed).toBe(true);
      expect(d.reasonCodes).toContain('ACCESS_ALLOWED_BY_SHARING_ACL');
    });

    it('#7b SHARING + ACL match + RBAC intent OK + org NONE (write) → allow ACCESS_ALLOWED_BY_SHARING_ACL', async () => {
      const { service, prisma, effectivePermissions, organizationScope, accessControl } =
        makeService();
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set([mod.permWriteScope]),
      );
      organizationScope.resolveOrgScope.mockResolvedValue({
        level: 'NONE',
        reasonCodes: ['SCOPE_OUT_OF_SUBTREE'],
      });
      accessControl.evaluateResourceAccess.mockResolvedValue({
        allowed: true,
        reasonCode: 'POLICY_SHARING_ACL_MATCH',
        effectiveAccessMode: 'SHARING_ACL_PLUS_FLOOR',
        aclRank: 2,
        mode: 'SHARING',
      });
      mod.setupPrismaOwner(prisma, 'ou-Y');

      const d = await service.decide({
        request,
        clientId,
        userId,
        resourceType: mod.resourceType,
        resourceId: RID,
        intent: 'write',
      });

      expect(d.allowed).toBe(true);
      expect(d.reasonCodes).toContain('ACCESS_ALLOWED_BY_SHARING_ACL');
    });

    it('#8 RESTRICTIVE + RBAC intent OK + ACL no-match → refus', async () => {
      const { service, prisma, effectivePermissions, organizationScope, accessControl } =
        makeService();
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set([mod.permManageAll]),
      );
      organizationScope.resolveOrgScope.mockResolvedValue({
        level: 'ALL',
        reasonCodes: ['ALL_RBAC_OVERRIDE'],
      });
      accessControl.evaluateResourceAccess.mockResolvedValue({
        allowed: false,
        reasonCode: 'POLICY_RESTRICTIVE_ACL_NO_MATCH',
        effectiveAccessMode: 'ACL_RESTRICTED',
        aclRank: 0,
        mode: 'RESTRICTIVE',
      });
      mod.setupPrismaOwner(prisma, 'ou-X');

      const d = await service.decide({
        request,
        clientId,
        userId,
        resourceType: mod.resourceType,
        resourceId: RID,
        intent: 'read',
      });

      expect(d.allowed).toBe(false);
    });

    it('#12 isolation inter-client : ressource non trouvée pour le client → refus', async () => {
      const { service, prisma, effectivePermissions, organizationScope } = makeService();
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set([mod.permReadAll]),
      );
      organizationScope.resolveOrgScope.mockResolvedValue({
        level: 'ALL',
        reasonCodes: ['ALL_RBAC_OVERRIDE'],
      });
      mod.setupPrismaOwner(prisma, 'ou-Y');
      const modelKeyCamel =
        mod.resourceType === 'CONTRACT'
          ? 'supplierContract'
          : mod.resourceType === 'STRATEGIC_OBJECTIVE'
            ? 'strategicObjective'
            : mod.resourceType.toLowerCase();
      (prisma as any)[modelKeyCamel].findMany.mockResolvedValue([]);

      const d = await service.decide({
        request,
        clientId,
        userId,
        resourceType: mod.resourceType,
        resourceId: RID,
        intent: 'read',
      });

      expect(d.allowed).toBe(false);
      expect(d.reasonCodes).toContain('ACCESS_DENIED_RESOURCE_NOT_FOUND');
    });
  });

  describe('BUDGET_LINE — héritage parent (§7.1 #9 et #10)', () => {
    function setupBudgetLine(owner: string | null, parentOwner: string | null) {
      const { service, prisma, effectivePermissions, organizationScope, accessControl } =
        makeService();
      prisma.budgetLine = {
        findMany: jest.fn().mockResolvedValue([
          {
            id: RID,
            budgetId: OTHER_RID,
            ownerOrgUnitId: owner,
            budget: { ownerOrgUnitId: parentOwner },
          },
        ]),
      };
      return { service, prisma, effectivePermissions, organizationScope, accessControl };
    }

    it('#9 BudgetLine sans owner propre, budget parent X, user read_scope X → autorisé (héritage parent)', async () => {
      const { service, effectivePermissions, organizationScope } = setupBudgetLine(
        null,
        'ou-X',
      );
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set(['budgets.read_scope']),
      );
      organizationScope.resolveOrgScope.mockResolvedValue({
        level: 'SCOPE',
        reasonCodes: ['SCOPE_IN_SUBTREE'],
      });

      const d = await service.decide({
        request,
        clientId,
        userId,
        resourceType: 'BUDGET_LINE',
        resourceId: RID,
        intent: 'read',
      });

      expect(d.allowed).toBe(true);
    });

    it('#10 BudgetLine : ACL appliquée au Budget parent (resourceId ACL = budgetId)', async () => {
      const { service, accessControl, effectivePermissions, organizationScope } =
        setupBudgetLine(null, 'ou-X');
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set(['budgets.read_scope']),
      );
      organizationScope.resolveOrgScope.mockResolvedValue({
        level: 'SCOPE',
        reasonCodes: ['SCOPE_IN_SUBTREE'],
      });
      accessControl.evaluateResourceAccess.mockResolvedValue({
        allowed: true,
        reasonCode: 'POLICY_DEFAULT_NO_ACL_PUBLIC',
        effectiveAccessMode: 'PUBLIC_DEFAULT',
        aclRank: 0,
        mode: 'DEFAULT',
      });

      await service.decide({
        request,
        clientId,
        userId,
        resourceType: 'BUDGET_LINE',
        resourceId: RID,
        intent: 'read',
      });

      expect(accessControl.evaluateResourceAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceTypeNormalized: 'BUDGET',
          resourceId: OTHER_RID, // budgetId parent, pas lineId
        }),
      );
    });
  });
});
