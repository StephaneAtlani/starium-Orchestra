import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  ProjectGovernanceCircleApi,
  ProjectTeamColorToken,
  ProjectTeamMemberRefApi,
} from '../types/project.types';

const BASE = '/api/projects';

export type ListProjectGovernanceCirclesResponse = {
  items: ProjectGovernanceCircleApi[];
};

export type ListProjectTeamsResponse = ListProjectGovernanceCirclesResponse;

export type ProjectTeamMemberInput = {
  identityKey: string;
  userId?: string | null;
  resourceId?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  /** E-mail externe (invitations) si pas de compte. */
  email?: string | null;
  sortOrder?: number;
};

export type CreateProjectTeamBody = {
  name: string;
  label?: string | null;
  colorToken?: ProjectTeamColorToken;
  pilotIdentityKey?: string | null;
  members?: ProjectTeamMemberInput[];
  sortOrder?: number;
};

export type UpdateProjectTeamBody = {
  name?: string;
  label?: string | null;
  colorToken?: ProjectTeamColorToken;
  pilotIdentityKey?: string | null;
  members?: ProjectTeamMemberInput[];
  sortOrder?: number;
};

export type DeleteProjectTeamResponse = {
  ok: boolean;
  message?: string;
  name?: string;
  reviewConvocationCount?: number;
};

export async function listProjectGovernanceCircles(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ListProjectGovernanceCirclesResponse> {
  const res = await authFetch(`${BASE}/${projectId}/teams`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ListProjectGovernanceCirclesResponse>;
}

export const listProjectTeams = listProjectGovernanceCircles;

export async function createProjectGovernanceCircle(
  authFetch: AuthFetch,
  projectId: string,
  body: CreateProjectTeamBody,
): Promise<ProjectGovernanceCircleApi> {
  const res = await authFetch(`${BASE}/${projectId}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectGovernanceCircleApi>;
}

export const createProjectTeam = createProjectGovernanceCircle;

export async function updateProjectGovernanceCircle(
  authFetch: AuthFetch,
  projectId: string,
  teamId: string,
  body: UpdateProjectTeamBody,
): Promise<ProjectGovernanceCircleApi> {
  const res = await authFetch(`${BASE}/${projectId}/teams/${teamId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectGovernanceCircleApi>;
}

export const updateProjectTeam = updateProjectGovernanceCircle;

export async function deleteProjectGovernanceCircle(
  authFetch: AuthFetch,
  projectId: string,
  teamId: string,
): Promise<DeleteProjectTeamResponse> {
  const res = await authFetch(`${BASE}/${projectId}/teams/${teamId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<DeleteProjectTeamResponse>;
}

export const deleteProjectTeam = deleteProjectGovernanceCircle;

export type InviteProjectTeamDirectoryPersonBody = {
  firstName: string;
  lastName: string;
  companyName?: string | null;
  email: string;
};

/** Upsert Resource HUMAN EXTERNAL + retourne le membre prêt à ajouter à l’équipe. */
export async function inviteProjectTeamDirectoryPerson(
  authFetch: AuthFetch,
  projectId: string,
  body: InviteProjectTeamDirectoryPersonBody,
): Promise<ProjectTeamMemberRefApi> {
  const res = await authFetch(`${BASE}/${projectId}/teams/directory-people`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTeamMemberRefApi>;
}

export type { ProjectTeamMemberRefApi };
