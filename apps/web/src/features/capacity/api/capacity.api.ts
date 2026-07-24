import type {
  CapacityAllocationDto,
  CapacityDashboardRow,
  CapacityPortfolioSummary,
  MemberMonthlyCapacityRow,
  MonthlyCapacityRow,
} from '../types/capacity.types';

type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export type ApiFormError = Error & { status?: number };

function toQueryString(record: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(record)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'boolean') search.set(k, v ? 'true' : 'false');
    else search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? 'Erreur lors de la requête');
    const error = new Error(message) as ApiFormError;
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text.trim()) return undefined as T;
  return JSON.parse(text) as T;
}

export async function getMonthlySettings(
  authFetch: AuthFetch,
  params: { from?: string; to?: string; year?: number } = {},
): Promise<{ items: MonthlyCapacityRow[] }> {
  const year =
    params.year ??
    (params.from ? Number(params.from.slice(0, 4)) : undefined);
  const qs = toQueryString({ year });
  const res = await authFetch(`/api/capacity/settings/monthly${qs}`);
  return handleResponse(res);
}

export async function putMonthlySettings(
  authFetch: AuthFetch,
  items: Array<{ yearMonth: string; days: number }>,
): Promise<{ items: MonthlyCapacityRow[] }> {
  const res = await authFetch(`/api/capacity/settings/monthly`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  return handleResponse(res);
}

export async function generateMonthlySettings(
  authFetch: AuthFetch,
  body: { year: number; force?: boolean },
): Promise<{ year: number; upserted: string[]; skipped: string[] }> {
  const res = await authFetch(`/api/capacity/settings/monthly/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function getMemberMonthly(
  authFetch: AuthFetch,
  resourceId: string,
  params: { from?: string; to?: string; year?: number } = {},
): Promise<{
  resourceId: string;
  resourceName: string;
  primaryCapacityWorkTeamId: string | null;
  primaryCapacityWorkTeamName: string | null;
  items: MemberMonthlyCapacityRow[];
}> {
  const year =
    params.year ??
    (params.from ? Number(params.from.slice(0, 4)) : undefined);
  const qs = toQueryString({ year });
  const res = await authFetch(`/api/capacity/members/${resourceId}/monthly${qs}`);
  return handleResponse(res);
}

export async function putMemberMonthly(
  authFetch: AuthFetch,
  resourceId: string,
  items: Array<{ yearMonth: string; days: number | null }>,
): Promise<{ items: MemberMonthlyCapacityRow[] }> {
  const res = await authFetch(`/api/capacity/members/${resourceId}/monthly`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  return handleResponse(res);
}

export async function patchPrimaryWorkTeam(
  authFetch: AuthFetch,
  resourceId: string,
  primaryCapacityWorkTeamId: string | null,
): Promise<{
  resourceId: string;
  primaryCapacityWorkTeamId: string | null;
  primaryCapacityWorkTeamName: string | null;
}> {
  const res = await authFetch(`/api/capacity/members/${resourceId}/primary-work-team`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ primaryCapacityWorkTeamId }),
  });
  return handleResponse(res);
}

export async function listAllocations(
  authFetch: AuthFetch,
  params: {
    limit?: number;
    offset?: number;
    yearMonth?: string;
    workTeamId?: string;
    resourceId?: string;
    sourceType?: string;
    sourceId?: string;
  } = {},
): Promise<{ items: CapacityAllocationDto[]; total: number; limit: number; offset: number }> {
  const qs = toQueryString(params);
  const res = await authFetch(`/api/capacity/allocations${qs}`);
  return handleResponse(res);
}

export async function getAllocation(
  authFetch: AuthFetch,
  id: string,
): Promise<CapacityAllocationDto> {
  const res = await authFetch(`/api/capacity/allocations/${id}`);
  return handleResponse(res);
}

export async function createAllocation(
  authFetch: AuthFetch,
  payload: {
    startDate: string;
    endDate: string;
    totalDays: number;
    comment?: string | null;
    workTeamId?: string | null;
    resourceId?: string | null;
    sourceType?: string;
    sourceId?: string | null;
  },
): Promise<CapacityAllocationDto> {
  const res = await authFetch(`/api/capacity/allocations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateAllocation(
  authFetch: AuthFetch,
  id: string,
  payload: Record<string, unknown>,
): Promise<CapacityAllocationDto> {
  const res = await authFetch(`/api/capacity/allocations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function deleteAllocation(authFetch: AuthFetch, id: string): Promise<void> {
  const res = await authFetch(`/api/capacity/allocations/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

export async function getDashboardResources(
  authFetch: AuthFetch,
  params: { from: string; to: string; includeArchivedWorkTeams?: boolean },
): Promise<{ items: CapacityDashboardRow[] }> {
  const qs = toQueryString(params);
  const res = await authFetch(`/api/capacity/dashboard/resources${qs}`);
  return handleResponse(res);
}

export async function getDashboardWorkTeams(
  authFetch: AuthFetch,
  params: { from: string; to: string; includeArchivedWorkTeams?: boolean },
): Promise<{ items: CapacityDashboardRow[] }> {
  const qs = toQueryString(params);
  const res = await authFetch(`/api/capacity/dashboard/work-teams${qs}`);
  return handleResponse(res);
}

export async function getDashboardPortfolio(
  authFetch: AuthFetch,
  params: { from: string; to: string; includeArchivedWorkTeams?: boolean },
): Promise<{ items: CapacityPortfolioSummary[] }> {
  const qs = toQueryString(params);
  const res = await authFetch(`/api/capacity/dashboard/portfolio${qs}`);
  return handleResponse(res);
}
