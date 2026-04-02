import type {
  CreateProjectResourceAssignmentPayload,
  CreateTeamResourceAssignmentPayload,
  ProjectResourceAssignmentsListParams,
  TeamResourceAssignment,
  TeamResourceAssignmentsListParams,
  TeamResourceAssignmentsListResponse,
  UpdateProjectResourceAssignmentPayload,
  UpdateTeamResourceAssignmentPayload,
} from '../types/team-assignment.types';

type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export type ApiFormError = Error & { status?: number };

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

function listQueryString(params: TeamResourceAssignmentsListParams): string {
  const search = new URLSearchParams();
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  if (params.collaboratorId) search.set('collaboratorId', params.collaboratorId);
  if (params.projectId) search.set('projectId', params.projectId);
  if (params.activityTypeId) search.set('activityTypeId', params.activityTypeId);
  if (params.includeCancelled === true) search.set('includeCancelled', 'true');
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.activeOn) search.set('activeOn', params.activeOn);
  const q = search.toString();
  return q ? `?${q}` : '';
}

const GLOBAL_BASE = '/api/team-resource-assignments';

export async function listTeamResourceAssignments(
  authFetch: AuthFetch,
  params: TeamResourceAssignmentsListParams,
): Promise<TeamResourceAssignmentsListResponse> {
  const res = await authFetch(`${GLOBAL_BASE}${listQueryString(params)}`);
  return handleResponse<TeamResourceAssignmentsListResponse>(res);
}

export async function getTeamResourceAssignmentById(
  authFetch: AuthFetch,
  id: string,
): Promise<TeamResourceAssignment> {
  const res = await authFetch(`${GLOBAL_BASE}/${id}`);
  return handleResponse<TeamResourceAssignment>(res);
}

export async function createTeamResourceAssignment(
  authFetch: AuthFetch,
  payload: CreateTeamResourceAssignmentPayload,
): Promise<TeamResourceAssignment> {
  const res = await authFetch(GLOBAL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<TeamResourceAssignment>(res);
}

export async function updateTeamResourceAssignment(
  authFetch: AuthFetch,
  id: string,
  payload: UpdateTeamResourceAssignmentPayload,
): Promise<TeamResourceAssignment> {
  const res = await authFetch(`${GLOBAL_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<TeamResourceAssignment>(res);
}

export async function cancelTeamResourceAssignment(
  authFetch: AuthFetch,
  id: string,
): Promise<TeamResourceAssignment> {
  const res = await authFetch(`${GLOBAL_BASE}/${id}/cancel`, { method: 'POST' });
  return handleResponse<TeamResourceAssignment>(res);
}

function projectListPath(projectId: string): string {
  return `/api/projects/${projectId}/resource-assignments`;
}

export async function listProjectResourceAssignments(
  authFetch: AuthFetch,
  projectId: string,
  params: ProjectResourceAssignmentsListParams,
): Promise<TeamResourceAssignmentsListResponse> {
  const res = await authFetch(
    `${projectListPath(projectId)}${listQueryString(params)}`,
  );
  return handleResponse<TeamResourceAssignmentsListResponse>(res);
}

export async function getProjectResourceAssignmentById(
  authFetch: AuthFetch,
  projectId: string,
  assignmentId: string,
): Promise<TeamResourceAssignment> {
  const res = await authFetch(`${projectListPath(projectId)}/${assignmentId}`);
  return handleResponse<TeamResourceAssignment>(res);
}

export async function createProjectResourceAssignment(
  authFetch: AuthFetch,
  projectId: string,
  payload: CreateProjectResourceAssignmentPayload,
): Promise<TeamResourceAssignment> {
  const res = await authFetch(projectListPath(projectId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<TeamResourceAssignment>(res);
}

export async function updateProjectResourceAssignment(
  authFetch: AuthFetch,
  projectId: string,
  assignmentId: string,
  payload: UpdateProjectResourceAssignmentPayload,
): Promise<TeamResourceAssignment> {
  const res = await authFetch(`${projectListPath(projectId)}/${assignmentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<TeamResourceAssignment>(res);
}

export async function cancelProjectResourceAssignment(
  authFetch: AuthFetch,
  projectId: string,
  assignmentId: string,
): Promise<TeamResourceAssignment> {
  const res = await authFetch(
    `${projectListPath(projectId)}/${assignmentId}/cancel`,
    { method: 'POST' },
  );
  return handleResponse<TeamResourceAssignment>(res);
}
