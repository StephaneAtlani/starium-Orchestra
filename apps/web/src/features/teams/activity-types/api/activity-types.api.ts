import type { AuthFetch } from '@/services/resources';

export type ActivityTypeListItem = {
  id: string;
  name: string;
  code: string | null;
};

export type ActivityTypesListResponse = {
  items: ActivityTypeListItem[];
  total: number;
  limit: number;
  offset: number;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: string | string[] })?.message;
    const message = Array.isArray(raw) ? raw.join(', ') : (raw ?? 'Erreur');
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function listActivityTypes(
  authFetch: AuthFetch,
  params: {
    limit?: number;
    offset?: number;
    /** Types marqués défaut par axe (RFC-TEAM-006) — évite de lister tout le référentiel client. */
    defaultsOnly?: boolean;
    kind?: string;
  } = {},
): Promise<ActivityTypesListResponse> {
  const q = new URLSearchParams();
  q.set('limit', String(Math.min(params.limit ?? 100, 100)));
  q.set('offset', String(params.offset ?? 0));
  if (params.defaultsOnly === true) q.set('defaultsOnly', 'true');
  if (params.kind?.trim()) q.set('kind', params.kind.trim());
  const res = await authFetch(`/api/activity-types?${q.toString()}`);
  return handleResponse<ActivityTypesListResponse>(res);
}
