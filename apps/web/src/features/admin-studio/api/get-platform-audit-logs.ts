import type { AdminPlatformAuditLogRow } from '../types/admin-studio.types';
import type { AuthFetch } from './get-clients';

export interface PlatformAuditLogsFilters {
  clientId?: string;
  resourceType?: string;
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PlatformAuditLogsResult {
  items: AdminPlatformAuditLogRow[];
  total: number;
}

export async function getPlatformAuditLogs(
  authFetch: AuthFetch,
  filters: PlatformAuditLogsFilters,
  offset: number,
  limit: number,
): Promise<PlatformAuditLogsResult> {
  const params = new URLSearchParams();
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.resourceType) params.set('resourceType', filters.resourceType);
  if (filters.action) params.set('action', filters.action);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  params.set('offset', String(offset));
  params.set('limit', String(limit));

  const res = await authFetch(`/api/platform/audit-logs?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Erreur lors du chargement des audit logs globaux');
  }
  const data = (await res.json()) as PlatformAuditLogsResult;
  return data;
}

