import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type PlatformUsageDailyPointDto = {
  /** Date civile UTC (YYYY-MM-DD). */
  date: string;
  auditLogs: number;
  securityLogs: number;
  newUsers: number;
  /** Connexions réussies (mot de passe, SSO Microsoft, appareil de confiance). */
  authLogins: number;
  /** Renouvellements de session `POST /auth/refresh`. */
  authRefreshes: number;
  /** Utilisateurs distincts ayant au moins une connexion réussie ce jour-là (SecurityLog, userId renseigné). */
  authDistinctUsers: number;
  /** Organisations (clients) distinctes touchées par au moins une connexion ce jour-là (membres actifs ClientUser). */
  authDistinctClients: number;
};

export type PlatformUsageOverviewDto = {
  generatedAt: string;
  /** Sessions : jetons refresh non révoqués et non expirés (approximation « utilisateurs pouvant être actifs »). */
  sessions: {
    distinctUsersWithActiveRefresh: number;
    activeRefreshTokens: number;
  };
  series: {
    /** 30 derniers jours (inclusif), un point par jour UTC. */
    daily: PlatformUsageDailyPointDto[];
  };
  totals: {
    clients: number;
    users: number;
    platformAdmins: number;
    clientMembershipsActive: number;
    projects: number;
    actionPlans: number;
    budgets: number;
    budgetLines: number;
    suppliers: number;
    purchaseOrders: number;
    complianceFrameworks: number;
    resources: number;
    collaborators: number;
  };
  activity: {
    auditLogsLast7Days: number;
    securityLogsLast7Days: number;
  };
  integrations: {
    microsoftConnections: number;
    directoryConnections: number;
  };
};

type DayCountRow = { day: Date; count: bigint };

@Injectable()
export class PlatformUsageService {
  constructor(private readonly prisma: PrismaService) {}

  /** 30 jours calendaires UTC se terminant aujourd’hui. */
  private last30UtcDayKeys(): string[] {
    const keys: string[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() - i,
        ),
      );
      keys.push(d.toISOString().slice(0, 10));
    }
    return keys;
  }

  private mapRowsToDayCount(rows: DayCountRow[]): Map<string, number> {
    const m = new Map<string, number>();
    for (const r of rows) {
      const day = r.day instanceof Date ? r.day : new Date(r.day as string);
      const key = day.toISOString().slice(0, 10);
      m.set(key, Number(r.count));
    }
    return m;
  }

  async getOverview(): Promise<PlatformUsageOverviewDto> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      auditDailyRows,
      securityDailyRows,
      newUsersDailyRows,
      authLoginsDailyRows,
      authRefreshesDailyRows,
      authDistinctUsersDailyRows,
      authDistinctClientsDailyRows,
      sessionUsersRow,
      activeRefreshTokens,
    ] = await Promise.all([
      this.prisma.$queryRaw<DayCountRow[]>`
        SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*)::bigint AS count
        FROM "AuditLog"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY 1
        ORDER BY 1
      `,
      this.prisma.$queryRaw<DayCountRow[]>`
        SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*)::bigint AS count
        FROM "SecurityLog"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY 1
        ORDER BY 1
      `,
      this.prisma.$queryRaw<DayCountRow[]>`
        SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*)::bigint AS count
        FROM "User"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY 1
        ORDER BY 1
      `,
      this.prisma.$queryRaw<DayCountRow[]>`
        SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*)::bigint AS count
        FROM "SecurityLog"
        WHERE "createdAt" >= ${thirtyDaysAgo}
          AND "event" IN (
            'auth.login.success',
            'auth.microsoft_sso.success',
            'auth.login.trusted_device'
          )
        GROUP BY 1
        ORDER BY 1
      `,
      this.prisma.$queryRaw<DayCountRow[]>`
        SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*)::bigint AS count
        FROM "SecurityLog"
        WHERE "createdAt" >= ${thirtyDaysAgo}
          AND "event" = 'auth.refresh'
        GROUP BY 1
        ORDER BY 1
      `,
      this.prisma.$queryRaw<DayCountRow[]>`
        SELECT date_trunc('day', "createdAt")::date AS day, COUNT(DISTINCT "userId")::bigint AS count
        FROM "SecurityLog"
        WHERE "createdAt" >= ${thirtyDaysAgo}
          AND "event" IN (
            'auth.login.success',
            'auth.microsoft_sso.success',
            'auth.login.trusted_device'
          )
          AND "userId" IS NOT NULL
        GROUP BY 1
        ORDER BY 1
      `,
      this.prisma.$queryRaw<DayCountRow[]>`
        SELECT date_trunc('day', sl."createdAt")::date AS day,
          COUNT(DISTINCT cu."clientId")::bigint AS count
        FROM "SecurityLog" sl
        INNER JOIN "ClientUser" cu
          ON cu."userId" = sl."userId" AND cu."status" = 'ACTIVE'
        WHERE sl."createdAt" >= ${thirtyDaysAgo}
          AND sl."event" IN (
            'auth.login.success',
            'auth.microsoft_sso.success',
            'auth.login.trusted_device'
          )
          AND sl."userId" IS NOT NULL
        GROUP BY 1
        ORDER BY 1
      `,
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "userId")::bigint AS count
        FROM "RefreshToken"
        WHERE "revokedAt" IS NULL
          AND "expiresAt" > ${now}
      `,
      this.prisma.refreshToken.count({
        where: {
          revokedAt: null,
          expiresAt: { gt: now },
        },
      }),
    ]);

    const auditByDay = this.mapRowsToDayCount(auditDailyRows);
    const securityByDay = this.mapRowsToDayCount(securityDailyRows);
    const usersByDay = this.mapRowsToDayCount(newUsersDailyRows);
    const authLoginsByDay = this.mapRowsToDayCount(authLoginsDailyRows);
    const authRefreshesByDay = this.mapRowsToDayCount(authRefreshesDailyRows);
    const authDistinctUsersByDay = this.mapRowsToDayCount(authDistinctUsersDailyRows);
    const authDistinctClientsByDay = this.mapRowsToDayCount(authDistinctClientsDailyRows);
    const dayKeys = this.last30UtcDayKeys();
    const daily: PlatformUsageDailyPointDto[] = dayKeys.map((date) => ({
      date,
      auditLogs: auditByDay.get(date) ?? 0,
      securityLogs: securityByDay.get(date) ?? 0,
      newUsers: usersByDay.get(date) ?? 0,
      authLogins: authLoginsByDay.get(date) ?? 0,
      authRefreshes: authRefreshesByDay.get(date) ?? 0,
      authDistinctUsers: authDistinctUsersByDay.get(date) ?? 0,
      authDistinctClients: authDistinctClientsByDay.get(date) ?? 0,
    }));

    const distinctUsersWithActiveRefresh = Number(sessionUsersRow[0]?.count ?? 0);

    const [
      clients,
      users,
      platformAdmins,
      clientMembershipsActive,
      projects,
      actionPlans,
      budgets,
      budgetLines,
      suppliers,
      purchaseOrders,
      complianceFrameworks,
      resources,
      collaborators,
      auditLogsLast7Days,
      securityLogsLast7Days,
      microsoftConnections,
      directoryConnections,
    ] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { platformRole: 'PLATFORM_ADMIN' } }),
      this.prisma.clientUser.count({ where: { status: 'ACTIVE' } }),
      this.prisma.project.count(),
      this.prisma.actionPlan.count(),
      this.prisma.budget.count(),
      this.prisma.budgetLine.count(),
      this.prisma.supplier.count(),
      this.prisma.purchaseOrder.count(),
      this.prisma.complianceFramework.count(),
      this.prisma.resource.count(),
      this.prisma.collaborator.count(),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.securityLog.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.microsoftConnection.count(),
      this.prisma.directoryConnection.count(),
    ]);

    return {
      generatedAt: now.toISOString(),
      sessions: {
        distinctUsersWithActiveRefresh,
        activeRefreshTokens,
      },
      series: { daily },
      totals: {
        clients,
        users,
        platformAdmins,
        clientMembershipsActive,
        projects,
        actionPlans,
        budgets,
        budgetLines,
        suppliers,
        purchaseOrders,
        complianceFrameworks,
        resources,
        collaborators,
      },
      activity: {
        auditLogsLast7Days,
        securityLogsLast7Days,
      },
      integrations: {
        microsoftConnections,
        directoryConnections,
      },
    };
  }
}
