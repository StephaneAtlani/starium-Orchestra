import { NotFoundException } from '@nestjs/common';
import {
  ClientSubscriptionStatus,
  SubscriptionBillingPeriod,
} from '@prisma/client';
import {
  AUDIT_RESOURCE_TYPE_CLIENT_SUBSCRIPTION,
  CLIENT_SUBSCRIPTION_ACTION,
} from '../audit-logs/acl-audit-actions';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
  let prisma: any;
  let auditLogs: { create: jest.Mock };
  let service: SubscriptionService;

  beforeEach(() => {
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      $transaction: jest.fn(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          clientSubscription: {
            create: (...a: unknown[]) => prisma.clientSubscription.create(...a),
            findFirst: (...a: unknown[]) => prisma.clientSubscription.findFirst(...a),
            update: (...a: unknown[]) => prisma.clientSubscription.update(...a),
          },
        }),
      ),
      client: { findUnique: jest.fn() },
      clientSubscription: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new SubscriptionService(prisma, auditLogs as any);
  });

  const subRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'sub-1',
    clientId: 'client-1',
    status: ClientSubscriptionStatus.DRAFT,
    billingPeriod: SubscriptionBillingPeriod.MONTHLY,
    readWriteSeatsLimit: 5,
    startsAt: null,
    endsAt: null,
    graceEndsAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  });

  it('create + audit atomique', async () => {
    prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });
    const created = subRow({ status: ClientSubscriptionStatus.DRAFT });
    prisma.clientSubscription.create.mockResolvedValue(created);

    await service.create(
      'client-1',
      {
        readWriteSeatsLimit: 5,
      },
      { actorUserId: 'admin-1', meta: { requestId: 'rid-1' } },
    );

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: CLIENT_SUBSCRIPTION_ACTION.CREATED,
        resourceType: AUDIT_RESOURCE_TYPE_CLIENT_SUBSCRIPTION,
        resourceId: 'sub-1',
        oldValue: expect.objectContaining({ subscription: null }),
        newValue: expect.objectContaining({
          subscription: expect.objectContaining({ id: 'sub-1' }),
        }),
        requestId: 'rid-1',
      }),
      expect.anything(),
    );
  });

  it('rollback si audit échoue dans la transaction', async () => {
    prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });
    prisma.clientSubscription.create.mockResolvedValue(subRow());
    auditLogs.create.mockRejectedValueOnce(new Error('audit fail'));

    await expect(
      service.create('client-1', { readWriteSeatsLimit: 3 }),
    ).rejects.toThrow('audit fail');
  });

  it('transition vers ACTIVE utilise client_subscription.activated', async () => {
    prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });
    const before = subRow({ status: ClientSubscriptionStatus.DRAFT });
    const after = { ...before, status: ClientSubscriptionStatus.ACTIVE };
    prisma.clientSubscription.findFirst.mockResolvedValue(before);
    prisma.clientSubscription.update.mockResolvedValue(after);

    await service.transition(
      'client-1',
      'sub-1',
      ClientSubscriptionStatus.ACTIVE,
      { actorUserId: 'a1' },
    );

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: CLIENT_SUBSCRIPTION_ACTION.ACTIVATED,
      }),
      expect.anything(),
    );
  });

  it('update sans changement ne déclenche pas de transaction audit', async () => {
    prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });
    const row = subRow();
    prisma.clientSubscription.findUnique.mockResolvedValue(row);

    const out = await service.update('client-1', 'sub-1', {});
    expect(out).toEqual(row);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('ensureSubscription NotFound', async () => {
    prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });
    prisma.clientSubscription.findUnique.mockResolvedValue(null);

    await expect(service.update('client-1', 'bad', { status: ClientSubscriptionStatus.ACTIVE })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
