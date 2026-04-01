import type {
  CollaboratorListItem,
  CollaboratorOptionsResponse,
  CollaboratorsListParams,
  CollaboratorsListResponse,
  CollaboratorUpdatePayload,
} from '../types/collaborator.types';

type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export type ApiFormError = Error & { status?: number };

function toQueryString(params: CollaboratorsListParams): string {
  const search = new URLSearchParams();
  if (params.search?.trim()) search.set('search', params.search.trim());
  for (const status of params.status ?? []) search.append('status', status);
  for (const source of params.source ?? []) search.append('source', source);
  for (const tag of params.tag ?? []) search.append('tag', tag);
  if (params.managerId) search.set('managerId', params.managerId);
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  const value = search.toString();
  return value ? `?${value}` : '';
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
  return res.json() as Promise<T>;
}

export async function listCollaborators(
  authFetch: AuthFetch,
  params: CollaboratorsListParams,
): Promise<CollaboratorsListResponse> {
  const res = await authFetch(`/api/collaborators${toQueryString(params)}`);
  return handleResponse<CollaboratorsListResponse>(res);
}

export async function getCollaboratorById(
  authFetch: AuthFetch,
  collaboratorId: string,
): Promise<CollaboratorListItem> {
  const res = await authFetch(`/api/collaborators/${collaboratorId}`);
  return handleResponse<CollaboratorListItem>(res);
}

export async function updateCollaborator(
  authFetch: AuthFetch,
  collaboratorId: string,
  payload: CollaboratorUpdatePayload,
): Promise<CollaboratorListItem> {
  const res = await authFetch(`/api/collaborators/${collaboratorId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<CollaboratorListItem>(res);
}

export async function listCollaboratorManagerOptions(
  authFetch: AuthFetch,
  params: { search?: string; offset?: number; limit?: number } = {},
): Promise<CollaboratorOptionsResponse> {
  const search = new URLSearchParams();
  if (params.search?.trim()) search.set('search', params.search.trim());
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  const query = search.toString();
  const res = await authFetch(`/api/collaborators/options/managers${query ? `?${query}` : ''}`);
  return handleResponse<CollaboratorOptionsResponse>(res);
}
