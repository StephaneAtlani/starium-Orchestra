import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  LicenseDistribution,
  LicenseReportingClientRow,
  LicenseReportingFilters,
  LicenseReportingMonthlyPoint,
  LicenseReportingMonthlySeries,
  LicenseReportingOverview,
  SubscriptionDistribution,
} from './license-reporting.types';

const MAX_MONTHS_WINDOW = 24;

type ClientUserSlim = {
  clientId: string;
  status: ClientUserStatus;
  licenseType: ClientUserLicenseType;
  licenseBillingMode: ClientUserLicenseBillingMode;
  licenseStartsAt: Date | null;
  licenseEndsAt: Date | null;
  createdAt: Date;
};

type SubscriptionSlim = {
  clientId: string;
  status: ClientSubscriptionStatus;
  readWriteSeatsLimit: number;
  startsAt: Date | null;
  endsAt: Date | null;
  graceEndsAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class LicenseReportingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Snapshot global plateforme — KPI agrégés tous clients filtrés. */
  async getOverview(filters: LicenseReportingFilters): Promise<LicenseReportingOverview> {
    await this.assertClientExists(filters.clientId);
    const now = new Date();
    const [users, subscriptions, clientsCount, activeUsersCount] = await Promise.all([
      this.fetchClientUsers(filters),
      this.fetchSubscriptions(filters),
      this.countClients(filters),
      this.countActiveUsers(filters),
    ]);

    const licenses = this.buildLicenseDistribution(users, now);
    const subs = this.buildSubscriptionDistribution(subscriptions, now);
    const seats = this.buildSeats(users, subscriptions, now);

    return {
      generatedAt: now.toISOString(),
      scope: 'platform',
      totals: {
        clients: clientsCount,
        clientUsersActive: activeUsersCount,
      },
      seats,
      licenses,
      subscriptions: subs,
    };
  }

  /** Détail par client (utilisable par la table UI + export CSV). */
  async listClients(filters: LicenseReportingFilters): Promise<LicenseReportingClientRow[]> {
    await this.assertClientExists(filters.clientId);
    const now = new Date();
    const [clients, users, subscriptions] = await Promise.all([
      this.prisma.client.findMany({
        where: filters.clientId ? { id: filters.clientId } : undefined,
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
      this.fetchClientUsers(filters),
      this.fetchSubscriptions(filters),
    ]);

    const usersByClient = groupBy(users, (u) => u.clientId);
    const subsByClient = groupBy(subscriptions, (s) => s.clientId);

    return clients.map((c) => {
      const cu = usersByClient.get(c.id) ?? [];
      const cs = subsByClient.get(c.id) ?? [];
      const licenses = this.buildLicenseDistribution(cu, now);
      const subs = this.buildSubscriptionDistribution(cs, now);
      const seats = this.buildSeats(cu, cs, now);
      return {
        clientId: c.id,
        clientName: c.name,
        clientSlug: c.slug,
        clientUsersActive: cu.filter((u) => u.status === ClientUserStatus.ACTIVE).length,
        seats,
        licenses,
        subscriptions: subs,
      };
    });
  }

  /**
   * Série mensuelle UTC dérivée des dates `licenseStartsAt/EndsAt`
   * et `subscription.startsAt/endsAt`. Pas de table d'agrégats
   * persistée en V1 (RFC §5).
   */
  async getMonthlySeries(
    filters: LicenseReportingFilters,
    range: { from?: string; to?: string },
  ): Promise<LicenseReportingMonthlySeries> {
    await this.assertClientExists(filters.clientId);
    const months = this.resolveMonthsRange(range.from, range.to);
    const fromDate = monthStart(months[0]);
    const toDate = monthEnd(months[months.length - 1]);

    const [users, subscriptions] = await Promise.all([
      this.fetchClientUsersInWindow(filters, fromDate, toDate),
      this.fetchSubscriptionsInWindow(filters, fromDate, toDate),
    ]);

    const points: LicenseReportingMonthlyPoint[] = months.map((monthKey) => {
      const start = monthStart(monthKey);
      const end = monthEnd(monthKey);
      const presentUsers = users.filter((u) => isPresentInWindow(start, end, u.licenseStartsAt ?? u.createdAt, u.licenseEndsAt));
      const presentSubs = subscriptions.filter((s) => isPresentInWindow(start, end, s.startsAt ?? s.createdAt, s.endsAt));
      return {
        month: monthKey,
        licenses: this.buildLicenseDistribution(presentUsers, end),
        subscriptions: {
          active: presentSubs.filter((s) => s.status === ClientSubscriptionStatus.ACTIVE).length,
          suspended: presentSubs.filter((s) => s.status === ClientSubscriptionStatus.SUSPENDED).length,
          expired: presentSubs.filter((s) => s.status === ClientSubscriptionStatus.EXPIRED).length,
        },
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      from: months[0],
      to: months[months.length - 1],
      points,
    };
  }

  // ---- helpers --------------------------------------------------------

  private async assertClientExists(clientId: string | undefined): Promise<void> {
    if (!clientId) return;
    const exists = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!exists) {
      // Anti-fuite : message stable, pas d'info révélée.
      throw new BadRequestException('Client introuvable');
    }
  }

  private async countClients(filters: LicenseReportingFilters): Promise<number> {
    return this.prisma.client.count({
      where: filters.clientId ? { id: filters.clientId } : undefined,
    });
  }

  private async countActiveUsers(filters: LicenseReportingFilters): Promise<number> {
    return this.prisma.clientUser.count({
      where: this.buildClientUserWhere(filters, { onlyActive: true }),
    });
  }

  private buildClientUserWhere(
    filters: LicenseReportingFilters,
    opts: { onlyActive?: boolean } = {},
  ): Prisma.ClientUserWhereInput {
    const where: Prisma.ClientUserWhereInput = {};
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.licenseBillingMode) where.licenseBillingMode = filters.licenseBillingMode;
    if (opts.onlyActive) where.status = ClientUserStatus.ACTIVE;
    return where;
  }

  private buildSubscriptionWhere(
    filters: LicenseReportingFilters,
  ): Prisma.ClientSubscriptionWhereInput {
    const where: Prisma.ClientSubscriptionWhereInput = {};
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.subscriptionStatus) where.status = filters.subscriptionStatus;
    return where;
  }

  private async fetchClientUsers(filters: LicenseReportingFilters): Promise<ClientUserSlim[]> {
    return this.prisma.clientUser.findMany({
      where: this.buildClientUserWhere(filters),
      select: {
        clientId: true,
        status: true,
        licenseType: true,
        licenseBillingMode: true,
        licenseStartsAt: true,
        licenseEndsAt: true,
        createdAt: true,
      },
    });
  }

  private async fetchSubscriptions(filters: LicenseReportingFilters): Promise<SubscriptionSlim[]> {
    return this.prisma.clientSubscription.findMany({
      where: this.buildSubscriptionWhere(filters),
      select: {
        clientId: true,
        status: true,
        readWriteSeatsLimit: true,
        startsAt: true,
        endsAt: true,
        graceEndsAt: true,
        createdAt: true,
      },
    });
  }

  private async fetchClientUsersInWindow(
    filters: LicenseReportingFilters,
    from: Date,
    to: Date,
  ): Promise<ClientUserSlim[]> {
    const where = this.buildClientUserWhere(filters);
    where.AND = [
      {
        OR: [
          { licenseEndsAt: null },
          { licenseEndsAt: { gte: from } },
        ],
      },
      {
        OR: [
          { licenseStartsAt: { lte: to } },
          {
            AND: [
              { licenseStartsAt: null },
              { createdAt: { lte: to } },
            ],
          },
        ],
      },
    ];
    return this.prisma.clientUser.findMany({
      where,
      select: {
        clientId: true,
        status: true,
        licenseType: true,
        licenseBillingMode: true,
        licenseStartsAt: true,
        licenseEndsAt: true,
        createdAt: true,
      },
    });
  }

  private async fetchSubscriptionsInWindow(
    filters: LicenseReportingFilters,
    from: Date,
    to: Date,
  ): Promise<SubscriptionSlim[]> {
    const where = this.buildSubscriptionWhere(filters);
    where.AND = [
      {
        OR: [
          { endsAt: null },
          { endsAt: { gte: from } },
        ],
      },
      {
        OR: [
          { startsAt: { lte: to } },
          {
            AND: [
              { startsAt: null },
              { createdAt: { lte: to } },
            ],
          },
        ],
      },
    ];
    return this.prisma.clientSubscription.findMany({
      where,
      select: {
        clientId: true,
        status: true,
        readWriteSeatsLimit: true,
        startsAt: true,
        endsAt: true,
        graceEndsAt: true,
        createdAt: true,
      },
    });
  }

  private buildLicenseDistribution(users: ClientUserSlim[], now: Date): LicenseDistribution {
    const dist: LicenseDistribution = {
      readOnly: 0,
      clientBillable: 0,
      externalBillable: 0,
      nonBillable: 0,
      platformInternal: 0,
      evaluationActive: 0,
      evaluationExpired: 0,
      platformInternalActive: 0,
      platformInternalExpired: 0,
    };

    for (const u of users) {
      if (u.status !== ClientUserStatus.ACTIVE) continue;
      const expired = isExpired(u.licenseEndsAt, now);
      if (u.licenseType === ClientUserLicenseType.READ_ONLY) {
        dist.readOnly += 1;
        continue;
      }
      switch (u.licenseBillingMode) {
        case ClientUserLicenseBillingMode.CLIENT_BILLABLE:
          if (!expired) dist.clientBillable += 1;
          break;
        case ClientUserLicenseBillingMode.EXTERNAL_BILLABLE:
          if (!expired) dist.externalBillable += 1;
          break;
        case ClientUserLicenseBillingMode.NON_BILLABLE:
          if (!expired) dist.nonBillable += 1;
          break;
        case ClientUserLicenseBillingMode.PLATFORM_INTERNAL:
          dist.platformInternal += 1;
          if (expired) dist.platformInternalExpired += 1;
          else dist.platformInternalActive += 1;
          break;
        case ClientUserLicenseBillingMode.EVALUATION:
          if (expired) dist.evaluationExpired += 1;
          else dist.evaluationActive += 1;
          break;
      }
    }
    return dist;
  }

  private buildSubscriptionDistribution(
    subscriptions: SubscriptionSlim[],
    now: Date,
  ): SubscriptionDistribution {
    const dist: SubscriptionDistribution = {
      draft: 0,
      active: 0,
      suspended: 0,
      canceled: 0,
      expired: 0,
      expiredInGrace: 0,
    };
    for (const s of subscriptions) {
      switch (s.status) {
        case ClientSubscriptionStatus.DRAFT:
          dist.draft += 1;
          break;
        case ClientSubscriptionStatus.ACTIVE:
          dist.active += 1;
          break;
        case ClientSubscriptionStatus.SUSPENDED:
          dist.suspended += 1;
          break;
        case ClientSubscriptionStatus.CANCELED:
          dist.canceled += 1;
          break;
        case ClientSubscriptionStatus.EXPIRED:
          dist.expired += 1;
          if (s.graceEndsAt instanceof Date && s.graceEndsAt.getTime() >= now.getTime()) {
            dist.expiredInGrace += 1;
          }
          break;
      }
    }
    return dist;
  }

  private buildSeats(
    users: ClientUserSlim[],
    subscriptions: SubscriptionSlim[],
    now: Date,
  ): { readWriteBillableUsed: number; readWriteBillableLimit: number } {
    const used = users.filter(
      (u) =>
        u.status === ClientUserStatus.ACTIVE &&
        u.licenseType === ClientUserLicenseType.READ_WRITE &&
        u.licenseBillingMode === ClientUserLicenseBillingMode.CLIENT_BILLABLE &&
        !isExpired(u.licenseEndsAt, now),
    ).length;
    const limit = subscriptions
      .filter((s) => s.status === ClientSubscriptionStatus.ACTIVE)
      .reduce((acc, s) => acc + s.readWriteSeatsLimit, 0);
    return { readWriteBillableUsed: used, readWriteBillableLimit: limit };
  }

  private resolveMonthsRange(fromInput?: string, toInput?: string): string[] {
    const now = new Date();
    const defaultTo = monthKeyUtc(now);
    const to = toInput ?? defaultTo;
    const defaultFrom = addMonths(to, -11);
    const from = fromInput ?? defaultFrom;

    if (compareMonthKeys(from, to) > 0) {
      throw new BadRequestException('from doit être <= to');
    }
    const months: string[] = [];
    let cursor = from;
    while (compareMonthKeys(cursor, to) <= 0) {
      months.push(cursor);
      cursor = addMonths(cursor, 1);
      if (months.length > MAX_MONTHS_WINDOW) {
        throw new BadRequestException(
          `Fenêtre temporelle trop large (max ${MAX_MONTHS_WINDOW} mois).`,
        );
      }
    }
    return months;
  }
}

// ---- pure helpers (testables sans Prisma) -----------------------------

function isExpired(end: Date | null | undefined, now: Date): boolean {
  if (!end) return false;
  return end.getTime() < now.getTime();
}

function isPresentInWindow(
  windowStart: Date,
  windowEnd: Date,
  start: Date,
  end: Date | null,
): boolean {
  if (start.getTime() > windowEnd.getTime()) return false;
  if (end !== null && end.getTime() < windowStart.getTime()) return false;
  return true;
}

function monthStart(key: string): Date {
  const [y, m] = key.split('-').map((s) => parseInt(s, 10));
  return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
}

function monthEnd(key: string): Date {
  const [y, m] = key.split('-').map((s) => parseInt(s, 10));
  return new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
}

function monthKeyUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map((s) => parseInt(s, 10));
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return monthKeyUtc(date);
}

function compareMonthKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function groupBy<T, K>(items: T[], key: (it: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}
