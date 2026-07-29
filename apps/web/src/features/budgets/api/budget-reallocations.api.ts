import type { ApiFormError } from './types';
import type {
  CreateBudgetReallocationPayload,
  ListBudgetReallocationsQuery,
  ListBudgetReallocationsResponse,
} from '../types/budget-reallocations.types';

export type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

const BASE = '/api/budget-reallocations';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let payload: ApiFormError | null = null;
    try {
      payload = (await res.json()) as ApiFormError;
    } catch {
      payload = null;
    }
    throw new Error(payload?.message || `Erreur API: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function buildQueryString(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function listBudgetReallocations(
  authFetch: AuthFetch,
  query?: ListBudgetReallocationsQuery,
): Promise<ListBudgetReallocationsResponse> {
  const qs = buildQueryString(query as Record<string, string | number | undefined>);
  const res = await authFetch(`${BASE}${qs}`);
  return handleResponse<ListBudgetReallocationsResponse>(res);
}

export async function createBudgetReallocation(
  authFetch: AuthFetch,
  payload: CreateBudgetReallocationPayload,
) {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}
