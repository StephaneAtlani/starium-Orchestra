import {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserRole,
  ClientUserStatus,
} from '@prisma/client';
import { CLIENT_USER_LICENSE_ACTION } from '../../audit-logs/acl-audit-actions';
import { LicenseExpirationRunnerService } from './license-expiration-runner.service';

describe('LicenseExpirationRunnerService', () => {
  it('downgrade une licence EVALUATION expirée avec audit', async () => {
    const before = {
      id: 'cu-1',
      userId: 'u-1',
      clientId: 'c-1',
      status: ClientUserStatus.ACTIVE,
      licenseType: ClientUserLicenseType.READ_WRITE,
      licenseBillingMode: ClientUserLicenseBillingMode.EVALUATION,
      subscriptionId: null,
      licenseStartsAt: null,
      licenseEndsAt: new Date('2026-05-07T08:00:00.000Z'),
      licenseAssignmentReason: 'eval',
    };
    const after = {
      ...before,
      licenseType: ClientUserLicenseType.READ_ONLY,
      licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
      licenseAssignmentReason: 'AUTO_EXPIRE_EVALUATION',
    };
    const tx = {
      clientUser: {
        findUnique: jest.fn().mockResolvedValue(before),
        update: jest.fn().mockResolvedValue(after),
      },
      notification: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      clientSubscription: {
        findUnique: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (cb: any) => cb(tx)),
      clientSubscription: { findMany: jest.fn().mockResolvedValue([]) },
      clientUser: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn() },
    } as any;
    const audit = { create: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new LicenseExpirationRunnerService(prisma, audit);

    const action = await (service as any).processLicenseExpiration(
      'cu-1',
      new Date('2026-05-07T10:00:00.000Z'),
      '2026-05-07T10:00:00.000Z',
    );

    expect(action).toBe(CLIENT_USER_LICENSE_ACTION.EVALUATION_EXPIRED);
    expect(tx.clientUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cu-1' },
        data: expect.objectContaining({
          licenseType: ClientUserLicenseType.READ_ONLY,
          licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
          subscriptionId: null,
        }),
      }),
    );
    expect(audit.create).toHaveBeenCalledTimes(1);
  });

  it('reste idempotent si la licence n est plus READ_WRITE', async () => {
    const tx = {
      clientUser: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cu-2',
          status: ClientUserStatus.ACTIVE,
          licenseType: ClientUserLicenseType.READ_ONLY,
          licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
          licenseEndsAt: new Date('2026-05-07T08:00:00.000Z'),
        }),
        update: jest.fn(),
      },
      notification: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (cb: any) => cb(tx)),
      clientSubscription: { findMany: jest.fn().mockResolvedValue([]) },
      clientUser: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn() },
    } as any;
    const audit = { create: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new LicenseExpirationRunnerService(prisma, audit);

    const action = await (service as any).processLicenseExpiration(
      'cu-2',
      new Date('2026-05-07T10:00:00.000Z'),
      '2026-05-07T10:00:00.000Z',
    );

    expect(action).toBeNull();
    expect(tx.clientUser.update).not.toHaveBeenCalled();
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('expire un abonnement puis downgrade les licences billables liées', async () => {
    const subscriptionBefore = {
      id: 'sub-1',
      clientId: 'c-1',
      status: ClientSubscriptionStatus.ACTIVE,
      billingPeriod: 'MONTHLY',
      readWriteSeatsLimit: 10,
      startsAt: null,
      endsAt: new Date('2026-05-06T00:00:00.000Z'),
      graceEndsAt: new Date('2026-05-06T00:00:00.000Z'),
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    };
    const subscriptionAfter = {
      ...subscriptionBefore,
      status: ClientSubscriptionStatus.EXPIRED,
    };
    const linkedMember = {
      id: 'cu-3',
      userId: 'u-3',
      clientId: 'c-1',
      status: ClientUserStatus.ACTIVE,
      licenseType: ClientUserLicenseType.READ_WRITE,
      licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
      subscriptionId: 'sub-1',
      licenseStartsAt: null,
      licenseEndsAt: null,
      licenseAssignmentReason: null,
    };

    const tx = {
      clientSubscription: {
        findUnique: jest.fn().mockResolvedValue(subscriptionBefore),
        update: jest.fn().mockResolvedValue(subscriptionAfter),
      },
      clientUser: {
        findMany: jest.fn(async (args: any) => {
          if (args.where?.role === ClientUserRole.CLIENT_ADMIN) {
            return [{ userId: 'admin-1' }];
          }
          return [linkedMember];
        }),
        update: jest.fn().mockResolvedValue({
          ...linkedMember,
          licenseType: ClientUserLicenseType.READ_ONLY,
          licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
          subscriptionId: null,
          licenseAssignmentReason: 'AUTO_EXPIRE_SUBSCRIPTION_ENDED',
        }),
      },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (cb: any) => cb(tx)),
      clientSubscription: { findMany: jest.fn().mockResolvedValue([]) },
      clientUser: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn() },
    } as any;
    const audit = { create: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new LicenseExpirationRunnerService(prisma, audit);

    const result = await (service as any).processSubscriptionExpiration(
      'sub-1',
      new Date('2026-05-07T10:00:00.000Z'),
      '2026-05-07T10:00:00.000Z',
    );

    expect(result).toEqual({
      processed: true,
      subscriptionExpired: true,
      downgradedLicenses: 1,
    });
    expect(tx.clientUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'c-1' }),
      }),
    );
    expect(audit.create).toHaveBeenCalledTimes(2);
    expect(tx.notification.create).toHaveBeenCalled();
  });
});
