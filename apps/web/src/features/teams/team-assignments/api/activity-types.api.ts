import type {
  ActivityTypesListParams,
  ActivityTypesListResponse,
} from '../types/activity-type.types';

type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? 'Erreur lors de la requête');
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function toQuery(params: ActivityTypesListParams): string {
  const search = new URLSearchParams();
  if (params.search?.trim()) search.set('search', params.search.trim());
  if (params.kind) search.set('kind', params.kind);
  if (params.includeArchived === true) search.set('includeArchived', 'true');
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  const q = search.toString();
  return q ? `?${q}` : '';
}

/** GET /api/activity-types — liste seule (MVP). */
export async function listActivityTypes(
  authFetch: AuthFetch,
  params: ActivityTypesListParams = {},
): Promise<ActivityTypesListResponse> {
  const res = await authFetch(`/api/activity-types${toQuery(params)}`);
  return handleResponse<ActivityTypesListResponse>(res);
}
