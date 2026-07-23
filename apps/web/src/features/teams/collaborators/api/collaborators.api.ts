import type {
  CollaboratorCreatePayload,
  CollaboratorListItem,
  CollaboratorOptionsResponse,
  CollaboratorsListParams,
  CollaboratorsListResponse,
  CollaboratorUpdatePayload,
  CollaboratorWorkTeamsResponse,
} from '../types/collaborator.types';

type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export type ApiFormError = Error & { status?: number; code?: string };

function toQueryString(params: CollaboratorsListParams): string {
  const search = new URLSearchParams();
  if (params.search?.trim()) search.set('search', params.search.trim());
  for (const status of params.status ?? []) search.append('status', status);
  for (const source of params.source ?? []) search.append('source', source);
  for (const tag of params.tag ?? []) search.append('tag', tag);
  if (params.managerId) search.set('managerId', params.managerId);
  if (params.platformUserLinkStatus) {
    search.set('platformUserLinkStatus', params.platformUserLinkStatus);
  }
  if (params.linkedUserId?.trim()) {
    search.set('linkedUserId', params.linkedUserId.trim());
  }
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  const value = search.toString();
  return value ? `?${value}` : '';
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string | string[] | { message?: string; code?: string };
      code?: string;
    };
    const raw = body.message;
    let message = 'Erreur lors de la requête';
    let code: string | undefined = typeof body.code === 'string' ? body.code : undefined;
    if (typeof raw === 'string') {
      message = raw;
    } else if (Array.isArray(raw)) {
      message = raw.join(', ');
    } else if (raw && typeof raw === 'object') {
      if (typeof raw.message === 'string') message = raw.message;
      if (typeof raw.code === 'string') code = raw.code;
    }
    const error = new Error(message) as ApiFormError;
    error.status = res.status;
    if (code) error.code = code;
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

export async function createCollaborator(
  authFetch: AuthFetch,
  payload: CollaboratorCreatePayload,
): Promise<CollaboratorListItem> {
  const res = await authFetch('/api/collaborators', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
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

export async function listCollaboratorWorkTeams(
  authFetch: AuthFetch,
  collaboratorId: string,
  params: { limit?: number; offset?: number; includeArchived?: boolean } = {},
): Promise<CollaboratorWorkTeamsResponse> {
  const search = new URLSearchParams();
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  if (params.includeArchived === true) search.set('includeArchived', 'true');
  const query = search.toString();
  const res = await authFetch(
    `/api/collaborators/${encodeURIComponent(collaboratorId)}/work-teams${query ? `?${query}` : ''}`,
  );
  return handleResponse(res);
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

export async function linkCollaboratorPlatformUser(
  authFetch: AuthFetch,
  collaboratorId: string,
  userId: string,
): Promise<CollaboratorListItem> {
  const res = await authFetch(
    `/api/collaborators/${encodeURIComponent(collaboratorId)}/link-platform-user`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    },
  );
  return handleResponse<CollaboratorListItem>(res);
}

export async function unlinkCollaboratorPlatformUser(
  authFetch: AuthFetch,
  collaboratorId: string,
): Promise<CollaboratorListItem> {
  const res = await authFetch(
    `/api/collaborators/${encodeURIComponent(collaboratorId)}/link-platform-user`,
    { method: 'DELETE' },
  );
  return handleResponse<CollaboratorListItem>(res);
}
