import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserStatus,
} from '@prisma/client';
import { CLIENT_USER_LICENSE_ACTION } from '../../modules/audit-logs/acl-audit-actions';
import { LicenseWriteGuard } from './license-write.guard';

describe('LicenseWriteGuard', () => {
  let guard: LicenseWriteGuard;
  let prisma: any;
  let reflector: any;
  let auditLogs: { create: jest.Mock };

  const makeContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getClass: () => ({}),
      getHandler: () => ({}),
    }) as ExecutionContext;

  beforeEach(() => {
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      clientUser: {
        findUnique: jest.fn(),
      },
    };
    reflector = {
      get: jest.fn(),
    } as unknown as Reflector;
    guard = new LicenseWriteGuard(prisma, reflector, auditLogs as any);
  });

  const enableGuardCheck = () => {
    reflector.get.mockReturnValueOnce(true).mockReturnValueOnce(true);
  };

  it('laisse passer une route non annotée', async () => {
    reflector.get.mockReturnValue(undefined);
    const can = await guard.canActivate(
      makeContext({ user: { userId: 'u1' }, activeClient: { id: 'c1' } }),
    );
    expect(can).toBe(true);
    expect(prisma.clientUser.findUnique).not.toHaveBeenCalled();
  });

  it('bloque si abonnement billable invalide malgré READ_WRITE', async () => {
    enableGuardCheck();
    prisma.clientUser.findUnique.mockResolvedValue({
      status: ClientUserStatus.ACTIVE,
      licenseType: ClientUserLicenseType.READ_WRITE,
      licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
      subscription: {
        id: 'sub-1',
        clientId: 'c1',
        status: ClientSubscriptionStatus.CANCELED,
        graceEndsAt: null,
      },
    });

    await expect(
      guard.canActivate(
        makeContext({ user: { userId: 'u1' }, activeClient: { id: 'c1' } }),
      ),
    ).rejects.toThrow('abonnement inactif');
  });

  it('bloque EVALUATION expirée', async () => {
    enableGuardCheck();
    prisma.clientUser.findUnique.mockResolvedValue({
      status: ClientUserStatus.ACTIVE,
      licenseType: ClientUserLicenseType.READ_WRITE,
      licenseBillingMode: ClientUserLicenseBillingMode.EVALUATION,
      licenseEndsAt: new Date(Date.now() - 1_000),
      subscription: null,
    });

    await expect(
      guard.canActivate(
        makeContext({ user: { userId: 'u1' }, activeClient: { id: 'c1' } }),
      ),
    ).rejects.toThrow('licence expirée');
  });

  it('bloque PLATFORM_INTERNAL expirée (support)', async () => {
    enableGuardCheck();
    prisma.clientUser.findUnique.mockResolvedValue({
      id: 'cu-1',
      status: ClientUserStatus.ACTIVE,
      licenseType: ClientUserLicenseType.READ_WRITE,
      licenseBillingMode: ClientUserLicenseBillingMode.PLATFORM_INTERNAL,
      licenseEndsAt: new Date(Date.now() - 1_000),
      subscription: null,
    });

    await expect(
      guard.canActivate(
        makeContext({
          user: { userId: 'u1' },
          activeClient: { id: 'c1' },
          headers: {},
          ip: '127.0.0.1',
        }),
      ),
    ).rejects.toThrow('accès support expiré');

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: CLIENT_USER_LICENSE_ACTION.WRITE_DENIED,
        resourceId: 'cu-1',
        newValue: expect.objectContaining({
          reasonCode: 'WRITE_DENIED_SUPPORT_ACCESS_EXPIRED',
          actorUserId: 'u1',
        }),
      }),
    );
  });

  it('bloque EXTERNAL_BILLABLE expirée', async () => {
    enableGuardCheck();
    prisma.clientUser.findUnique.mockResolvedValue({
      status: ClientUserStatus.ACTIVE,
      licenseType: ClientUserLicenseType.READ_WRITE,
      licenseBillingMode: ClientUserLicenseBillingMode.EXTERNAL_BILLABLE,
      licenseEndsAt: new Date(Date.now() - 1_000),
      subscription: null,
    });

    await expect(
      guard.canActivate(
        makeContext({ user: { userId: 'u1' }, activeClient: { id: 'c1' } }),
      ),
    ).rejects.toThrow('licence expirée');
  });

  it('journalise READ_ONLY puis 403 même si audit échoue', async () => {
    enableGuardCheck();
    auditLogs.create.mockRejectedValueOnce(new Error('audit down'));
    prisma.clientUser.findUnique.mockResolvedValue({
      id: 'cu-r',
      status: ClientUserStatus.ACTIVE,
      licenseType: ClientUserLicenseType.READ_ONLY,
      licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
      subscription: null,
    });

    await expect(
      guard.canActivate(
        makeContext({
          user: { userId: 'u1' },
          activeClient: { id: 'c1' },
          headers: { 'x-request-id': 'rid-9' },
        }),
      ),
    ).rejects.toThrow('READ_WRITE');

    expect(auditLogs.create).toHaveBeenCalled();
  });

  it('n altère pas la licence expirée', async () => {
    enableGuardCheck();
    prisma.clientUser.findUnique.mockResolvedValue({
      id: 'cu-1',
      status: ClientUserStatus.ACTIVE,
      licenseType: ClientUserLicenseType.READ_WRITE,
      licenseBillingMode: ClientUserLicenseBillingMode.EVALUATION,
      licenseEndsAt: new Date(Date.now() - 1_000),
      subscription: null,
    });

    await expect(
      guard.canActivate(
        makeContext({ user: { userId: 'u1' }, activeClient: { id: 'c1' } }),
      ),
    ).rejects.toThrow('licence expirée');
    expect(prisma.clientUser.findUnique).toHaveBeenCalledTimes(1);
  });
});
