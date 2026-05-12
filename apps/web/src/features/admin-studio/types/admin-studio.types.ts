export interface AdminClientSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  /** Pièces procurement dont le stockage n’est pas encore S3 (sentinel `local`). */
  procurementAttachmentsNotOnS3Count: number;
  /** S3 procurement résolu côté plateforme. */
  procurementS3Configured: boolean;
}

export interface AdminClientUserSummary {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
  /** RFC-ORG-002 — fiche Resource HUMAN liée (affichage métier). */
  humanResourceSummary?: {
    resourceId: string;
    displayName: string;
    email: string | null;
  } | null;
}

/** Licence courante d'un user pour un client donné (vue compacte plateforme). */
export interface AdminPlatformUserLicense {
  clientId: string;
  clientName: string;
  clientSlug: string;
  role: 'CLIENT_ADMIN' | 'CLIENT_USER';
  licenseType: 'READ_ONLY' | 'READ_WRITE';
  licenseBillingMode:
    | 'CLIENT_BILLABLE'
    | 'NON_BILLABLE'
    | 'EXTERNAL_BILLABLE'
    | 'PLATFORM_INTERNAL'
    | 'EVALUATION';
  licenseEndsAt: string | null;
}

export interface AdminPlatformUserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;
  platformRole: string | null;
  /** IDs des clients auxquels l'utilisateur est rattaché. */
  clientIds: string[];
  /** Licences courantes par client. */
  licenses: AdminPlatformUserLicense[];
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
  authLogins: number;
  authRefreshes: number;
  /** Utilisateurs distincts avec au moins une connexion réussie ce jour-là. */
  authDistinctUsers: number;
  /** Clients distincts (membres actifs) concernés par au moins une connexion ce jour-là. */
  authDistinctClients: number;
}

/** GET /platform/usage-overview — vue agrégée pour le tableau de bord plateforme. */
export interface PlatformUsageOverview {
  generatedAt: string;
  /** Jetons refresh valides : approximation des utilisateurs « connectés » (session ouverte possible). */
  sessions: {
    distinctUsersWithActiveRefresh: number;
    activeRefreshTokens: number;
  };
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

