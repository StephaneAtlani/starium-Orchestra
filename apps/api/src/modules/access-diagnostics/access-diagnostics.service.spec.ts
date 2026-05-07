import { ClientSubscriptionStatus } from '@prisma/client';
import { AccessDiagnosticsService } from './access-diagnostics.service';

describe('AccessDiagnosticsService', () => {
  let service: AccessDiagnosticsService;
  let prisma: any;
  let accessControl: any;
  let moduleVisibility: any;
  let effectivePermissions: any;

  beforeEach(() => {
    prisma = {
      clientUser: { findFirst: jest.fn() },
      module: { findFirst: jest.fn() },
      project: { findFirst: jest.fn() },
      budget: { findFirst: jest.fn() },
      supplierContract: { findFirst: jest.fn() },
      supplier: { findFirst: jest.fn() },
      strategicObjective: { findFirst: jest.fn() },
    };
    accessControl = {
      canReadResource: jest.fn().mockResolvedValue(true),
      canWriteResource: jest.fn().mockResolvedValue(true),
      canAdminResource: jest.fn().mockResolvedValue(true),
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
    prisma.module.findFirst.mockResolvedValue({ id: 'm1' });
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
  });

  it('retourne un refus générique hors périmètre client (aucune fuite)', async () => {
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
  });

  it('mappe operation=read sur RBAC read + ACL read', async () => {
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
