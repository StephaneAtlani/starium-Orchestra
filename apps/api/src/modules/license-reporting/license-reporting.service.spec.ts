import { BadRequestException } from '@nestjs/common';
import {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserStatus,
} from '@prisma/client';
import { LicenseReportingService } from './license-reporting.service';

type MockPrisma = {
  client: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  clientUser: { findMany: jest.Mock; count: jest.Mock };
  clientSubscription: { findMany: jest.Mock };
};

function buildService(): { service: LicenseReportingService; prisma: MockPrisma } {
  const prisma: MockPrisma = {
    client: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    clientUser: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    clientSubscription: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const service = new LicenseReportingService(prisma as any);
  return { service, prisma };
}

const NOW = new Date('2026-05-15T12:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('LicenseReportingService.getOverview', () => {
  it('agrège licences et abonnements par mode et statut', async () => {
    const { service, prisma } = buildService();
    prisma.client.count.mockResolvedValue(2);
    prisma.clientUser.count.mockResolvedValue(4);
    prisma.clientUser.findMany.mockResolvedValue([
      {
        clientId: 'c1',
        status: ClientUserStatus.ACTIVE,
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
        licenseStartsAt: null,
        licenseEndsAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        clientId: 'c1',
        status: ClientUserStatus.ACTIVE,
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.EVALUATION,
        licenseStartsAt: null,
        licenseEndsAt: new Date('2026-04-01T00:00:00Z'),
        createdAt: new Date('2026-03-01T00:00:00Z'),
      },
      {
        clientId: 'c2',
        status: ClientUserStatus.ACTIVE,
        licenseType: ClientUserLicenseType.READ_ONLY,
        licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
        licenseStartsAt: null,
        licenseEndsAt: null,
        createdAt: new Date('2026-02-01T00:00:00Z'),
      },
      {
        clientId: 'c2',
        status: ClientUserStatus.ACTIVE,
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.PLATFORM_INTERNAL,
        licenseStartsAt: null,
        licenseEndsAt: new Date('2026-12-31T00:00:00Z'),
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);
    prisma.clientSubscription.findMany.mockResolvedValue([
      {
        clientId: 'c1',
        status: ClientSubscriptionStatus.ACTIVE,
        readWriteSeatsLimit: 5,
        startsAt: null,
        endsAt: null,
        graceEndsAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        clientId: 'c2',
        status: ClientSubscriptionStatus.EXPIRED,
        readWriteSeatsLimit: 3,
        startsAt: null,
        endsAt: new Date('2026-04-30T00:00:00Z'),
        graceEndsAt: new Date('2026-06-15T00:00:00Z'),
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);

    const result = await service.getOverview({});

    expect(result.scope).toBe('platform');
    expect(result.totals.clients).toBe(2);
    expect(result.totals.clientUsersActive).toBe(4);
    expect(result.licenses.clientBillable).toBe(1);
    expect(result.licenses.evaluationExpired).toBe(1);
    expect(result.licenses.evaluationActive).toBe(0);
    expect(result.licenses.platformInternalActive).toBe(1);
    expect(result.licenses.readOnly).toBe(1);
    expect(result.subscriptions.active).toBe(1);
    expect(result.subscriptions.expired).toBe(1);
    expect(result.subscriptions.expiredInGrace).toBe(1);
    expect(result.seats.readWriteBillableUsed).toBe(1);
    expect(result.seats.readWriteBillableLimit).toBe(5);
  });

  it('rejette un clientId inexistant (anti-fuite, message stable)', async () => {
    const { service, prisma } = buildService();
    prisma.client.findUnique.mockResolvedValue(null);
    await expect(
      service.getOverview({ clientId: 'cxxxxxxxxxxxxxxxxxxxxxxxx' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('respecte le filtre licenseBillingMode dans le WHERE Prisma', async () => {
    const { service, prisma } = buildService();
    prisma.client.count.mockResolvedValue(1);
    await service.getOverview({
      licenseBillingMode: ClientUserLicenseBillingMode.EVALUATION,
    });
    const calls = prisma.clientUser.findMany.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0][0].where).toMatchObject({
      licenseBillingMode: ClientUserLicenseBillingMode.EVALUATION,
    });
  });
});

describe('LicenseReportingService.listClients', () => {
  it('produit une ligne par client avec libellé métier (clientName)', async () => {
    const { service, prisma } = buildService();
    prisma.client.findMany.mockResolvedValue([
      { id: 'c1', name: 'Acme', slug: 'acme' },
      { id: 'c2', name: 'Beta', slug: 'beta' },
    ]);
    prisma.clientUser.findMany.mockResolvedValue([
      {
        clientId: 'c1',
        status: ClientUserStatus.ACTIVE,
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
        licenseStartsAt: null,
        licenseEndsAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);
    prisma.clientSubscription.findMany.mockResolvedValue([
      {
        clientId: 'c1',
        status: ClientSubscriptionStatus.ACTIVE,
        readWriteSeatsLimit: 10,
        startsAt: null,
        endsAt: null,
        graceEndsAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);

    const rows = await service.listClients({});
    expect(rows).toHaveLength(2);
    const acme = rows.find((r) => r.clientId === 'c1');
    const beta = rows.find((r) => r.clientId === 'c2');
    expect(acme?.clientName).toBe('Acme');
    expect(acme?.clientUsersActive).toBe(1);
    expect(acme?.seats.readWriteBillableLimit).toBe(10);
    expect(beta?.clientUsersActive).toBe(0);
    expect(beta?.seats.readWriteBillableLimit).toBe(0);
  });
});

describe('LicenseReportingService.getMonthlySeries', () => {
  it('génère 12 mois par défaut, dernier point = mois courant UTC', async () => {
    const { service, prisma } = buildService();
    prisma.clientUser.findMany.mockResolvedValue([]);
    prisma.clientSubscription.findMany.mockResolvedValue([]);

    const series = await service.getMonthlySeries({}, {});
    expect(series.points).toHaveLength(12);
    expect(series.to).toBe('2026-05');
    expect(series.from).toBe('2025-06');
  });

  it('compte une licence comme présente uniquement pendant la fenêtre [start, end]', async () => {
    const { service, prisma } = buildService();
    prisma.clientUser.findMany.mockResolvedValue([
      {
        clientId: 'c1',
        status: ClientUserStatus.ACTIVE,
        licenseType: ClientUserLicenseType.READ_WRITE,
        licenseBillingMode: ClientUserLicenseBillingMode.EVALUATION,
        licenseStartsAt: new Date('2026-02-15T00:00:00Z'),
        licenseEndsAt: new Date('2026-03-15T00:00:00Z'),
        createdAt: new Date('2026-02-15T00:00:00Z'),
      },
    ]);
    prisma.clientSubscription.findMany.mockResolvedValue([]);

    const series = await service.getMonthlySeries({}, { from: '2026-01', to: '2026-04' });
    const m = (key: string) => series.points.find((p) => p.month === key);

    expect(m('2026-01')?.licenses.evaluationActive).toBe(0);
    expect(m('2026-01')?.licenses.evaluationExpired).toBe(0);
    expect(m('2026-02')?.licenses.evaluationActive).toBe(1);
    expect(m('2026-02')?.licenses.evaluationExpired).toBe(0);
    expect(m('2026-03')?.licenses.evaluationActive).toBe(0);
    expect(m('2026-03')?.licenses.evaluationExpired).toBe(1);
    expect(m('2026-04')?.licenses.evaluationActive).toBe(0);
    expect(m('2026-04')?.licenses.evaluationExpired).toBe(0);
  });

  it('refuse une fenêtre temporelle > 24 mois', async () => {
    const { service } = buildService();
    await expect(
      service.getMonthlySeries({}, { from: '2024-01', to: '2026-04' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse from > to', async () => {
    const { service } = buildService();
    await expect(
      service.getMonthlySeries({}, { from: '2026-05', to: '2026-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
