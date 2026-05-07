import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserStatus,
} from '@prisma/client';
import {
  AUDIT_RESOURCE_TYPE_CLIENT_USER_LICENSE,
  CLIENT_USER_LICENSE_ACTION,
} from '../audit-logs/acl-audit-actions';
import { LicenseService } from './license.service';

describe('LicenseService', () => {
  const clientId = 'client-1';
  const userId = 'user-1';
  let service: LicenseService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };

  beforeEach(() => {
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      $transaction: jest.fn(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          clientUser: {
            findFirst: (...a: unknown[]) => prisma.clientUser.findFirst(...a),
            update: (...a: unknown[]) => prisma.clientUser.update(...a),
          },
        }),
      ),
      clientUser: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      clientSubscription: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new LicenseService(prisma, auditLogs as any);
  });

  const mockMembership = (overrides: Record<string, unknown> = {}) => ({
    id: 'cu-1',
    userId,
    clientId,
    status: ClientUserStatus.ACTIVE,
    licenseType: ClientUserLicenseType.READ_ONLY,
    licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
    subscriptionId: null,
    licenseAssignmentReason: null,
    licenseEndsAt: null,
    licenseStartsAt: null,
    ...overrides,
  });

  it('autorise READ_ONLY + NON_BILLABLE sans motif (compat backfill ACL-001)', async () => {
    const mem = mockMembership();
    prisma.clientUser.findUnique.mockResolvedValue(mem);
    prisma.clientUser.findFirst.mockResolvedValue(mem);
    prisma.clientUser.update.mockResolvedValue(mem);

    await service.assignByPlatform('platform-admin', clientId, userId, {
      licenseType: ClientUserLicenseType.READ_ONLY,
      licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
      licenseAssignmentReason: null,
    });

    expect(prisma.clientUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          licenseType: ClientUserLicenseType.READ_ONLY,
          licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
          subscriptionId: null,
          licenseAssignmentReason: null,
        }),
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    expect(auditLogs.create.mock.calls[0][1]).toBeDefined();
  });

  it('émèt une seule action canonique et resourceType/resourceId stables', async () => {
    const beforeMem = mockMembership({
      licenseType: ClientUserLicenseType.READ_WRITE,
      licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
      subscriptionId: 'sub-1',
    });
    prisma.clientUser.findUnique.mockResolvedValue(beforeMem);
    prisma.clientUser.findFirst.mockResolvedValue(beforeMem);
    prisma.clientUser.update.mockResolvedValue({
      ...beforeMem,
      licenseBillingMode: ClientUserLicenseBillingMode.EVALUATION,
      subscriptionId: null,
      licenseAssignmentReason: 'test produit',
      licenseEndsAt: new Date(Date.now() + 86_400_000),
    });

    await service.assignByPlatform('platform-admin', clientId, userId, {
      licenseType: ClientUserLicenseType.READ_WRITE,
      licenseBillingMode: ClientUserLicenseBillingMode.EVALUATION,
      licenseAssignmentReason: 'test produit',
      licenseEndsAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    const input = auditLogs.create.mock.calls[0][0];
    expect(input.action).toBe(CLIENT_USER_LICENSE_ACTION.EVALUATION_GRANTED);
    expect(input.resourceType).toBe(AUDIT_RESOURCE_TYPE_CLIENT_USER_LICENSE);
    expect(input.resourceId).toBe('cu-1');
    expect(input.oldValue).toMatchObject({
      assignment: expect.any(Object),
      meta: expect.objectContaining({ targetUserId: userId }),
    });
    expect(input.newValue).toMatchObject({
      assignment: expect.any(Object),
      meta: expect.objectContaining({ targetUserId: userId }),
    });
  });

  it('propage l’échec audit (rollback transactionnel côté API)', async () => {
    const mem = mockMembership();
    prisma.clientUser.findUnique.mockResolvedValue(mem);
    prisma.clientUser.findFirst.mockResolvedValue(mem);
    prisma.clientUser.update.mockResolvedValue(mem);
    auditLogs.create.mockRejectedValueOnce(new Error('audit indisponible'));

    await expect(
      service.assignByPlatform('platform-admin', clientId, userId, {
        licenseType: ClientUserLicenseType.READ_ONLY,
        licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
        licenseAssignmentReason: null,
      }),
    ).rejects.toThrow('audit indisponible');

    expect(prisma.clientUser.update).toHaveBeenCalled();
    expect(auditLogs.create).toHaveBeenCalled();
  });

  it('refuse READ_WRITE + NON_BILLABLE sans motif', async () => {
    prisma.clientUser.findUnique.mockResolvedValue(mockMembership());

    await expect(
      service.assignByPlatform('platform-admin', clientId, userId, {
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuse READ_WRITE + CLIENT_BILLABLE sans subscriptionId', async () => {
    prisma.clientUser.findUnique.mockResolvedValue(mockMembership());

    await expect(
      service.assignByPlatform('platform-admin', clientId, userId, {
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse READ_ONLY + EVALUATION', async () => {
    prisma.clientUser.findUnique.mockResolvedValue(mockMembership());

    await expect(
      service.assignByPlatform('platform-admin', clientId, userId, {
        licenseType: ClientUserLicenseType.READ_ONLY,
        licenseBillingMode: ClientUserLicenseBillingMode.EVALUATION,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse READ_ONLY + PLATFORM_INTERNAL', async () => {
    prisma.clientUser.findUnique.mockResolvedValue(mockMembership());

    await expect(
      service.assignByPlatform('platform-admin', clientId, userId, {
        licenseType: ClientUserLicenseType.READ_ONLY,
        licenseBillingMode: ClientUserLicenseBillingMode.PLATFORM_INTERNAL,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse READ_ONLY + EXTERNAL_BILLABLE', async () => {
    prisma.clientUser.findUnique.mockResolvedValue(mockMembership());

    await expect(
      service.assignByPlatform('platform-admin', clientId, userId, {
        licenseType: ClientUserLicenseType.READ_ONLY,
        licenseBillingMode: ClientUserLicenseBillingMode.EXTERNAL_BILLABLE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse READ_ONLY + CLIENT_BILLABLE', async () => {
    prisma.clientUser.findUnique.mockResolvedValue(mockMembership());

    await expect(
      service.assignByPlatform('platform-admin', clientId, userId, {
        licenseType: ClientUserLicenseType.READ_ONLY,
        licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse EXTERNAL_BILLABLE sans motif', async () => {
    prisma.clientUser.findUnique.mockResolvedValue(mockMembership());

    await expect(
      service.assignByPlatform('platform-admin', clientId, userId, {
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.EXTERNAL_BILLABLE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse EXTERNAL_BILLABLE avec subscriptionId non null', async () => {
    prisma.clientUser.findUnique.mockResolvedValue(mockMembership());

    await expect(
      service.assignByPlatform('platform-admin', clientId, userId, {
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.EXTERNAL_BILLABLE,
        subscriptionId: 'sub-1',
        licenseAssignmentReason: 'facturation externe',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('EXTERNAL_BILLABLE ne consomme pas de siège client', async () => {
    const mem = mockMembership();
    prisma.clientUser.findUnique.mockResolvedValue(mem);
    prisma.clientUser.findFirst.mockResolvedValue(mem);
    prisma.clientUser.update.mockResolvedValue({
      ...mem,
      licenseType: ClientUserLicenseType.READ_WRITE,
      licenseBillingMode: ClientUserLicenseBillingMode.EXTERNAL_BILLABLE,
      licenseAssignmentReason: 'consultant externe',
    });

    await service.assignByPlatform('platform-admin', clientId, userId, {
      licenseType: ClientUserLicenseType.READ_WRITE,
      licenseBillingMode: ClientUserLicenseBillingMode.EXTERNAL_BILLABLE,
      licenseAssignmentReason: 'consultant externe',
    });

    expect(prisma.clientUser.count).not.toHaveBeenCalled();
    expect(prisma.clientUser.update).toHaveBeenCalled();
  });

  it('conversion CLIENT_BILLABLE -> mode spécial remet subscriptionId à null', async () => {
    prisma.clientUser.findUnique.mockResolvedValue(
      mockMembership({
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
        subscriptionId: 'sub-1',
      }),
    );
    prisma.clientUser.findFirst.mockResolvedValue(
      mockMembership({
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
        subscriptionId: 'sub-1',
      }),
    );
    prisma.clientUser.update.mockResolvedValue({ id: 'cu-1' });

    await service.assignByPlatform('platform-admin', clientId, userId, {
      licenseType: ClientUserLicenseType.READ_WRITE,
      licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
      licenseAssignmentReason: 'support interne temporaire',
    });

    expect(prisma.clientUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subscriptionId: null,
        }),
      }),
    );
  });

  it('auto-génère licenseEndsAt pour EVALUATION sans date', async () => {
    const mem = mockMembership();
    prisma.clientUser.findUnique.mockResolvedValue(mem);
    prisma.clientUser.findFirst.mockResolvedValue(mem);
    prisma.clientUser.update.mockImplementation(async (args: any) => ({
      ...mem,
      ...args.data,
      licenseEndsAt: args.data.licenseEndsAt,
    }));

    await service.assignByPlatform('platform-admin', clientId, userId, {
      licenseType: ClientUserLicenseType.READ_WRITE,
      licenseBillingMode: ClientUserLicenseBillingMode.EVALUATION,
      licenseAssignmentReason: 'test produit',
    });

    const call = prisma.clientUser.update.mock.calls[0][0];
    expect(call.data.licenseEndsAt).toBeInstanceOf(Date);
  });

  it('refuse PLATFORM_INTERNAL sans date de fin', async () => {
    prisma.clientUser.findUnique.mockResolvedValue(mockMembership());

    await expect(
      service.assignByPlatform('platform-admin', clientId, userId, {
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.PLATFORM_INTERNAL,
        licenseAssignmentReason: 'support',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bloque ecriture si RBAC potentiellement OK mais licence READ_ONLY', async () => {
    prisma.clientUser.findUnique.mockResolvedValue(mockMembership({ subscription: null }));

    await expect(service.validateWriteAccess(userId, clientId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('bloque ecriture si EVALUATION expirée', async () => {
    prisma.clientUser.findUnique.mockResolvedValue(
      mockMembership({
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.EVALUATION,
        licenseEndsAt: new Date(Date.now() - 5_000),
        subscription: null,
      }),
    );

    await expect(service.validateWriteAccess(userId, clientId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('bloque ecriture si PLATFORM_INTERNAL expirée', async () => {
    prisma.clientUser.findUnique.mockResolvedValue(
      mockMembership({
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.PLATFORM_INTERNAL,
        licenseEndsAt: new Date(Date.now() - 5_000),
        subscription: null,
      }),
    );

    await expect(service.validateWriteAccess(userId, clientId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('client admin interdit d’attribuer EXTERNAL_BILLABLE, PLATFORM_INTERNAL, EVALUATION et READ_WRITE+NON_BILLABLE', async () => {
    const forbiddenModes = [
      ClientUserLicenseBillingMode.EXTERNAL_BILLABLE,
      ClientUserLicenseBillingMode.PLATFORM_INTERNAL,
      ClientUserLicenseBillingMode.EVALUATION,
      ClientUserLicenseBillingMode.NON_BILLABLE,
    ];

    for (const billingMode of forbiddenModes) {
      prisma.clientUser.findUnique
        .mockResolvedValueOnce({ id: 'cu-admin', userId: 'admin-1', clientId })
        .mockResolvedValueOnce({ id: 'cu-target', userId, clientId });
      await expect(
        service.assignByClientAdmin('admin-1', clientId, userId, {
          licenseType: ClientUserLicenseType.READ_WRITE,
          licenseBillingMode: billingMode,
          licenseAssignmentReason: 'test',
          ...(billingMode === ClientUserLicenseBillingMode.PLATFORM_INTERNAL
            ? { licenseEndsAt: new Date(Date.now() + 60_000).toISOString() }
            : {}),
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
  });
});
