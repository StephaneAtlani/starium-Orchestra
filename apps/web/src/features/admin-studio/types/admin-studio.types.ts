export interface AdminClientSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
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

