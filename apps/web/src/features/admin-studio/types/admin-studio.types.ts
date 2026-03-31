export interface AdminClientSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface AdminClientUserSummary {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
}

export interface AdminPlatformUserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;
  platformRole: string | null;
}

export interface AdminPlatformAuditLogRow {
  id: string;
  createdAt: string;
  clientId: string | null;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  // oldValue / newValue / ipAddress / userAgent / requestId sont présents dans l’API
  // mais non affichés dans le MVP UI.
}

/** Point journalier (UTC) pour les graphiques plateforme. */
export interface PlatformUsageDailyPoint {
  date: string;
  auditLogs: number;
  securityLogs: number;
  newUsers: number;
}

/** GET /platform/usage-overview — vue agrégée pour le tableau de bord plateforme. */
export interface PlatformUsageOverview {
  generatedAt: string;
  series: {
    daily: PlatformUsageDailyPoint[];
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
}

