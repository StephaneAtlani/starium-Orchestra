import { ClientSubscriptionStatus } from '@prisma/client';
import { AccessDiagnosticsService } from './access-diagnostics.service';

describe('AccessDiagnosticsService', () => {
  let service: AccessDiagnosticsService;
  let prisma: any;
  let accessControl: any;
  let moduleVisibility: any;
  let effectivePermissions: any;
  let auditLogs: { create: jest.Mock };
  let config: { get: jest.Mock };
  let accessDecision: { decide: jest.Mock };
  let organizationScope: { resolveOrgScope: jest.Mock };

  const engineAllowedShape = {
    allowed: true,
    reasonCodes: ['ACCESS_ALLOWED_BY_LEGACY_PERMISSION'] as string[],
    resourceType: 'PROJECT' as const,
    resourceId: 'p1',
    intent: 'read' as const,
    rbac: {
      allowed: true,
      matchedPermission: 'projects.read',
      requiredCandidates: ['projects.read'],
    },
    orgScope: {
      required: false,
      verdict: { level: 'ALL' as const, reasonCodes: ['ALL_RBAC_OVERRIDE'] as const },
    },
    acl: {
      allowed: true,
      reasonCode: 'POLICY_DEFAULT_PUBLIC',
      mode: 'DEFAULT',
      effectiveAccessMode: 'DEFAULT',
    },
    floorAllowed: true,
  };

  beforeEach(() => {
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    config = { get: jest.fn().mockReturnValue(undefined) };
    accessDecision = {
      decide: jest.fn().mockResolvedValue(engineAllowedShape),
    };
    organizationScope = {
      resolveOrgScope: jest.fn().mockResolvedValue({
        level: 'ALL',
        reasonCodes: ['ALL_RBAC_OVERRIDE'],
      }),
    };
    prisma = {
      clientUser: { findFirst: jest.fn() },
      module: { findFirst: jest.fn() },
      project: { findFirst: jest.fn() },
      budget: { findFirst: jest.fn() },
      supplierContract: { findFirst: jest.fn() },
      supplier: { findFirst: jest.fn() },
      strategicObjective: { findFirst: jest.fn() },
      orgUnit: { findFirst: jest.fn() },
    };
    accessControl = {
      canReadResource: jest.fn().mockResolvedValue(true),
      canWriteResource: jest.fn().mockResolvedValue(true),
      canAdminResource: jest.fn().mockResolvedValue(true),
      canReadResourceWithSimulatedAcl: jest.fn().mockResolvedValue(true),
      canWriteResourceWithSimulatedAcl: jest.fn().mockResolvedValue(true),
      canAdminResourceWithSimulatedAcl: jest.fn().mockResolvedValue(true),
      evaluateResourceAccess: jest.fn().mockResolvedValue({
        allowed: true,
        reasonCode: 'POLICY_DEFAULT_PUBLIC',
        mode: 'DEFAULT',
        effectiveAccessMode: 'DEFAULT',
      }),
    };
    moduleVisibility = { isVisibleForUser: jest.fn().mockResolvedValue(true) };
    effectivePermissions = {
      resolvePermissionCodesForRequest: jest
        .fn()
        .mockResolvedValue(new Set(['projects.read', 'projects.update', 'projects.delete'])),
    };
    service = new AccessDiagnosticsService(
      prisma,
      accessControl,
      moduleVisibility,
      effectivePermissions,
      auditLogs as any,
      config as any,
      accessDecision as any,
      organizationScope as any,
    );
  });

  function mockInScopeProject() {
    prisma.clientUser.findFirst.mockResolvedValue({
      userId: 'u1',
      clientId: 'c1',
      status: 'ACTIVE',
      licenseType: 'READ_WRITE',
      licenseBillingMode: 'NON_BILLABLE',
      licenseEndsAt: null,
      subscriptionId: null,
      subscription: null,
    });
    prisma.project.findFirst.mockResolvedValue({
      id: 'p1',
      clientId: 'c1',
      name: 'Projet A',
      code: 'PRJ-A',
    });
    prisma.project.findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'p1', ownerOrgUnitId: 'ou-1' }]);
    prisma.module.findFirst.mockResolvedValue({ id: 'm1' });
    prisma.orgUnit.findFirst.mockResolvedValue({
      name: 'Direction IT',
      code: 'IT',
      status: 'ACTIVE',
      archivedAt: null,
    });
  }

  it('retourne RESOURCE_TYPE_UNSUPPORTED pour un type non supporté', async () => {
    const result = await service.computeEffectiveRights({
      clientId: 'c1',
      userId: 'u1',
      resourceType: 'DOCUMENT' as any,
      resourceId: 'r1',
      operation: 'read',
    });
    expect(result.finalDecision).toBe('denied');
    expect(result.denialReasons[0]?.reasonCode).toBe('RESOURCE_TYPE_UNSUPPORTED');
    expect(accessDecision.decide).not.toHaveBeenCalled();
  });

  it('retourne un refus générique hors périmètre client (aucune fuite)', async () => {
    config.get.mockReturnValue('true');
    prisma.clientUser.findFirst.mockResolvedValue(null);
    prisma.project.findFirst.mockResolvedValue(null);
    const result = await service.computeEffectiveRights({
      clientId: 'c1',
      userId: 'u-out',
      resourceType: 'PROJECT',
      resourceId: 'p-out',
      operation: 'read',
    });
    expect(result.finalDecision).toBe('denied');
    expect(result.denialReasons).toEqual([
      expect.objectContaining({ reasonCode: 'DIAGNOSTIC_SCOPE_MISMATCH' }),
    ]);
    expect(accessDecision.decide).not.toHaveBeenCalled();
  });

  it('mappe operation=read sur RBAC read + ACL read (flag enrichi désactivé)', async () => {
    mockInScopeProject();
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['projects.read']),
    );

    const result = await service.computeEffectiveRights({
      clientId: 'c1',
      userId: 'u1',
      resourceType: 'PROJECT',
      resourceId: 'p1',
      operation: 'read',
    });

    expect(result.finalDecision).toBe('allowed');
    expect(accessControl.canReadResource).toHaveBeenCalledTimes(1);
    expect(accessControl.canWriteResource).not.toHaveBeenCalled();
    expect(accessControl.canAdminResource).not.toHaveBeenCalled();
    expect(accessDecision.decide).not.toHaveBeenCalled();
    expect(result.organizationScopeCheck).toBeUndefined();
    expect(result.licenseCheck.evaluationMode).toBeUndefined();
  });

  it('READ + flag enrichi : decide() prime ; legacy ACL en échec mais moteur allowed → final allowed + superseded', async () => {
    config.get.mockReturnValue('true');
    mockInScopeProject();
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['projects.read']),
    );
    accessControl.canReadResource.mockResolvedValue(false);
    accessDecision.decide.mockResolvedValue(engineAllowedShape);

    const result = await service.computeEffectiveRights({
      clientId: 'c1',
      userId: 'u1',
      resourceType: 'PROJECT',
      resourceId: 'p1',
      operation: 'read',
    });

    expect(accessDecision.decide).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'c1',
        userId: 'u1',
        resourceType: 'PROJECT',
        resourceId: 'p1',
        intent: 'read',
      }),
    );
    expect(result.finalDecision).toBe('allowed');
    expect(result.aclCheck.evaluationMode).toBe('superseded_by_decision_engine');
    expect(result.aclCheck.status).toBe('pass');
    expect(result.organizationScopeCheck?.enforcedForIntent).toBe(true);
  });

  it('READ + flag enrichi : decide() refusé alors que legacy ACL pass → denied + ACL informational', async () => {
    config.get.mockReturnValue('true');
    mockInScopeProject();
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['projects.read']),
    );
    accessControl.canReadResource.mockResolvedValue(true);
    accessDecision.decide.mockResolvedValue({
      ...engineAllowedShape,
      allowed: false,
      reasonCodes: ['ACCESS_DENIED_ORG_SCOPE', 'ACCESS_DENIED_ACL_POLICY'],
      acl: {
        allowed: false,
        reasonCode: 'POLICY_RESTRICTIVE_NO_ACL',
        mode: 'RESTRICTIVE',
        effectiveAccessMode: 'RESTRICTIVE',
      },
    });

    const result = await service.computeEffectiveRights({
      clientId: 'c1',
      userId: 'u1',
      resourceType: 'PROJECT',
      resourceId: 'p1',
      operation: 'read',
    });

    expect(result.finalDecision).toBe('denied');
    expect(result.aclCheck.evaluationMode).toBe('informational');
    expect(result.aclCheck.status).toBe('pass');
  });

  it('mappe operation=write sur RBAC update + ACL write', async () => {
    mockInScopeProject();
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['projects.update']),
    );

    const result = await service.computeEffectiveRights({
      clientId: 'c1',
      userId: 'u1',
      resourceType: 'PROJECT',
      resourceId: 'p1',
      operation: 'write',
    });

    expect(result.finalDecision).toBe('allowed');
    expect(accessControl.canWriteResource).toHaveBeenCalledTimes(1);
    expect(accessDecision.decide).not.toHaveBeenCalled();
  });

  it('mappe operation=admin sur RBAC delete + ACL admin', async () => {
    mockInScopeProject();
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['projects.delete']),
    );

    const result = await service.computeEffectiveRights({
      clientId: 'c1',
      userId: 'u1',
      resourceType: 'PROJECT',
      resourceId: 'p1',
      operation: 'admin',
    });

    expect(result.finalDecision).toBe('allowed');
    expect(accessControl.canAdminResource).toHaveBeenCalledTimes(1);
    expect(accessDecision.decide).not.toHaveBeenCalled();
  });

  it('write + flag enrichi : blocs informatifs enforcedForIntent false, finalDecision legacy', async () => {
    config.get.mockReturnValue('true');
    mockInScopeProject();
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['projects.update']),
    );

    const result = await service.computeEffectiveRights({
      clientId: 'c1',
      userId: 'u1',
      resourceType: 'PROJECT',
      resourceId: 'p1',
      operation: 'write',
    });

    expect(result.finalDecision).toBe('allowed');
    expect(result.organizationScopeCheck?.enforcedForIntent).toBe(false);
    expect(result.licenseCheck.evaluationMode).toBeUndefined();
    expect(accessDecision.decide).not.toHaveBeenCalled();
  });

  it('signale une dépendance RBAC bloquante si mapping admin absent', async () => {
    prisma.clientUser.findFirst.mockResolvedValue({
      userId: 'u1',
      clientId: 'c1',
      status: 'ACTIVE',
      licenseType: 'READ_WRITE',
      licenseBillingMode: 'NON_BILLABLE',
      licenseEndsAt: null,
      subscriptionId: null,
      subscription: null,
    });
    prisma.budget.findFirst.mockResolvedValue({
      id: 'b1',
      clientId: 'c1',
      name: 'Budget 2026',
      code: 'B26',
    });
    prisma.module.findFirst.mockResolvedValue({ id: 'm1' });
    const result = await service.computeEffectiveRights({
      clientId: 'c1',
      userId: 'u1',
      resourceType: 'BUDGET',
      resourceId: 'b1',
      operation: 'admin',
    });
    expect(result.finalDecision).toBe('denied');
    expect(result.denialReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reasonCode: 'RBAC_PERMISSION_MAPPING_MISSING' }),
      ]),
    );
  });

  it('échoue subscriptionCheck pour licence billable avec abonnement invalide', async () => {
    prisma.clientUser.findFirst.mockResolvedValue({
      userId: 'u1',
      clientId: 'c1',
      status: 'ACTIVE',
      licenseType: 'READ_WRITE',
      licenseBillingMode: 'CLIENT_BILLABLE',
      licenseEndsAt: null,
      subscriptionId: 'sub-1',
      subscription: {
        status: ClientSubscriptionStatus.SUSPENDED,
        graceEndsAt: null,
      },
    });
    prisma.project.findFirst.mockResolvedValue({
      id: 'p1',
      clientId: 'c1',
      name: 'Projet A',
      code: 'PRJ-A',
    });
    prisma.module.findFirst.mockResolvedValue({ id: 'm1' });
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['projects.read']),
    );

    const result = await service.computeEffectiveRights({
      clientId: 'c1',
      userId: 'u1',
      resourceType: 'PROJECT',
      resourceId: 'p1',
      operation: 'read',
    });
    expect(result.finalDecision).toBe('denied');
    expect(result.subscriptionCheck.reasonCode).toBe('SUBSCRIPTION_INACTIVE');
  });
});
