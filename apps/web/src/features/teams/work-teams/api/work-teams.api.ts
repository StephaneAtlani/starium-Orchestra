import type {
  AddWorkTeamMemberPayload,
  CreateWorkTeamPayload,
  ManagerScopeDto,
  ManagerScopePreviewParams,
  ManagerScopePreviewResponse,
  PutManagerScopePayload,
  UpdateWorkTeamPayload,
  WorkTeamDto,
  WorkTeamMembersParams,
  WorkTeamMembersResponse,
  WorkTeamsListParams,
  WorkTeamsListResponse,
  WorkTeamsTreeParams,
  WorkTeamsTreeResponse,
} from '../types/work-team.types';
import type { WorkTeamMemberRole } from '../types/work-team.types';

type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export type ApiFormError = Error & { status?: number };

function toQueryString(record: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(record)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'boolean') {
      search.set(k, v ? 'true' : 'false');
    } else {
      search.set(k, String(v));
    }
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

export async function listWorkTeams(
  authFetch: AuthFetch,
  params: WorkTeamsListParams = {},
): Promise<WorkTeamsListResponse> {
  const qs = toQueryString({
    limit: params.limit,
    offset: params.offset,
    q: params.q?.trim() || undefined,
    parentId: params.parentId ?? undefined,
    status: params.status,
    includeArchived: params.includeArchived,
    leadResourceId: params.leadResourceId?.trim() || undefined,
  });
  const res = await authFetch(`/api/work-teams${qs}`);
  return handleResponse<WorkTeamsListResponse>(res);
}

export async function getWorkTeamsTree(
  authFetch: AuthFetch,
  params: WorkTeamsTreeParams = {},
): Promise<WorkTeamsTreeResponse> {
  const qs = toQueryString({
    parentId: params.parentId ?? undefined,
    includeArchived: params.includeArchived,
  });
  const res = await authFetch(`/api/work-teams/tree${qs}`);
  return handleResponse<WorkTeamsTreeResponse>(res);
}

export async function getWorkTeamById(authFetch: AuthFetch, id: string): Promise<WorkTeamDto> {
  const res = await authFetch(`/api/work-teams/${id}`);
  return handleResponse<WorkTeamDto>(res);
}

export async function createWorkTeam(
  authFetch: AuthFetch,
  payload: CreateWorkTeamPayload,
): Promise<WorkTeamDto> {
  const res = await authFetch('/api/work-teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<WorkTeamDto>(res);
}

export async function updateWorkTeam(
  authFetch: AuthFetch,
  id: string,
  payload: UpdateWorkTeamPayload,
): Promise<WorkTeamDto> {
  const res = await authFetch(`/api/work-teams/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<WorkTeamDto>(res);
}

export async function archiveWorkTeam(authFetch: AuthFetch, id: string): Promise<WorkTeamDto> {
  const res = await authFetch(`/api/work-teams/${id}/archive`, {
    method: 'PATCH',
  });
  return handleResponse<WorkTeamDto>(res);
}

export async function restoreWorkTeam(authFetch: AuthFetch, id: string): Promise<WorkTeamDto> {
  const res = await authFetch(`/api/work-teams/${id}/restore`, {
    method: 'PATCH',
  });
  return handleResponse<WorkTeamDto>(res);
}

export async function listWorkTeamMembers(
  authFetch: AuthFetch,
  teamId: string,
  params: WorkTeamMembersParams = {},
): Promise<WorkTeamMembersResponse> {
  const qs = toQueryString({
    limit: params.limit,
    offset: params.offset,
    q: params.q?.trim() || undefined,
  });
  const res = await authFetch(`/api/work-teams/${teamId}/members${qs}`);
  return handleResponse<WorkTeamMembersResponse>(res);
}

export async function addWorkTeamMember(
  authFetch: AuthFetch,
  teamId: string,
  payload: AddWorkTeamMemberPayload,
): Promise<WorkTeamMembersResponse['items'][number]> {
  const res = await authFetch(`/api/work-teams/${teamId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateWorkTeamMember(
  authFetch: AuthFetch,
  teamId: string,
  membershipId: string,
  role: WorkTeamMemberRole,
): Promise<WorkTeamMembersResponse['items'][number]> {
  const res = await authFetch(`/api/work-teams/${teamId}/members/${membershipId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  return handleResponse(res);
}

export async function removeWorkTeamMember(
  authFetch: AuthFetch,
  teamId: string,
  membershipId: string,
): Promise<void> {
  const res = await authFetch(`/api/work-teams/${teamId}/members/${membershipId}`, {
    method: 'DELETE',
  });
  await handleResponse<void>(res);
}

export async function getManagerScope(
  authFetch: AuthFetch,
  managerResourceId: string,
): Promise<ManagerScopeDto> {
  const res = await authFetch(`/api/manager-scopes/${managerResourceId}`);
  return handleResponse<ManagerScopeDto>(res);
}

export async function putManagerScope(
  authFetch: AuthFetch,
  managerResourceId: string,
  payload: PutManagerScopePayload,
): Promise<ManagerScopeDto> {
  const res = await authFetch(`/api/manager-scopes/${managerResourceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<ManagerScopeDto>(res);
}

export async function previewManagerScope(
  authFetch: AuthFetch,
  managerResourceId: string,
  params: ManagerScopePreviewParams = {},
): Promise<ManagerScopePreviewResponse> {
  const qs = toQueryString({
    limit: params.limit,
    offset: params.offset,
    q: params.q?.trim() || undefined,
  });
  const res = await authFetch(`/api/manager-scopes/${managerResourceId}/preview${qs}`);
  return handleResponse<ManagerScopePreviewResponse>(res);
}
