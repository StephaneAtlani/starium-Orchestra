export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export type AlertItem = {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  entityLabel: string | null;
  actionUrl: string | null;
  createdAt: string;
};

export type AlertListResponse = {
  items: AlertItem[];
  total: number;
  limit: number;
  offset: number;
};

export async function listAlerts(
  authFetch: AuthFetch,
  params?: { severity?: 'INFO' | 'WARNING' | 'CRITICAL'; status?: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'; limit?: number; offset?: number },
): Promise<AlertListResponse> {
  const sp = new URLSearchParams();
  if (params?.severity) sp.set('severity', params.severity);
  if (params?.status) sp.set('status', params.status);
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.offset != null) sp.set('offset', String(params.offset));
  const q = sp.toString();
  const res = await authFetch(`/api/alerts${q ? `?${q}` : ''}`);
  if (!res.ok) throw new Error('Chargement alertes impossible');
  return res.json();
}

export async function resolveAlert(
  authFetch: AuthFetch,
  id: string,
): Promise<void> {
  const res = await authFetch(`/api/alerts/${id}/resolve`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Resolution alerte impossible');
}

export async function dismissAlert(
  authFetch: AuthFetch,
  id: string,
): Promise<void> {
  const res = await authFetch(`/api/alerts/${id}/dismiss`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Dismiss alerte impossible');
}
