import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  InviteProjectReviewResult,
  ProjectReviewAgendaItemApi,
  ProjectReviewDetail,
  ProjectReviewListResponse,
  ProjectReviewParticipantApi,
  ProjectReviewParticipantAttendanceStatus,
} from '../types/project.types';

const base = (projectId: string) => `/api/projects/${projectId}/reviews`;

export async function listProjectReviews(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectReviewListResponse> {
  const res = await authFetch(base(projectId));
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewListResponse>;
}

export async function getProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function createProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  body: Record<string, unknown>,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(base(projectId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function updateProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  body: Record<string, unknown>,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function startProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/start-review`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function finalizeProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/finalize`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function cancelProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/cancel`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function inviteProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  body?: { participantIds?: string[] },
): Promise<InviteProjectReviewResult> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<InviteProjectReviewResult>;
}

const agendaBase = (projectId: string, reviewId: string) =>
  `${base(projectId)}/${reviewId}/agenda-items`;

export async function createProjectReviewAgendaItem(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  body: Record<string, unknown>,
): Promise<ProjectReviewAgendaItemApi> {
  const res = await authFetch(agendaBase(projectId, reviewId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewAgendaItemApi>;
}

export async function updateProjectReviewAgendaItem(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  agendaItemId: string,
  body: Record<string, unknown>,
): Promise<ProjectReviewAgendaItemApi> {
  const res = await authFetch(`${agendaBase(projectId, reviewId)}/${agendaItemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewAgendaItemApi>;
}

export async function reorderProjectReviewAgendaItems(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  items: Array<{ id: string; orderIndex: number }>,
): Promise<{ ok: boolean }> {
  const res = await authFetch(`${agendaBase(projectId, reviewId)}/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ ok: boolean }>;
}

export async function startProjectReviewAgendaItem(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  agendaItemId: string,
): Promise<ProjectReviewAgendaItemApi> {
  const res = await authFetch(
    `${agendaBase(projectId, reviewId)}/${agendaItemId}/start`,
    { method: 'POST' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewAgendaItemApi>;
}

export async function completeProjectReviewAgendaItem(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  agendaItemId: string,
): Promise<ProjectReviewAgendaItemApi> {
  const res = await authFetch(
    `${agendaBase(projectId, reviewId)}/${agendaItemId}/complete`,
    { method: 'POST' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewAgendaItemApi>;
}

export async function skipProjectReviewAgendaItem(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  agendaItemId: string,
): Promise<ProjectReviewAgendaItemApi> {
  const res = await authFetch(
    `${agendaBase(projectId, reviewId)}/${agendaItemId}/skip`,
    { method: 'POST' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewAgendaItemApi>;
}

const participantsBase = (projectId: string, reviewId: string) =>
  `${base(projectId)}/${reviewId}/participants`;

export async function createProjectReviewParticipant(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  body: Record<string, unknown>,
): Promise<ProjectReviewParticipantApi> {
  const res = await authFetch(participantsBase(projectId, reviewId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewParticipantApi>;
}

export async function updateProjectReviewParticipant(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  participantId: string,
  body: Record<string, unknown>,
): Promise<ProjectReviewParticipantApi> {
  const res = await authFetch(
    `${participantsBase(projectId, reviewId)}/${participantId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewParticipantApi>;
}

export async function deleteProjectReviewParticipant(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  participantId: string,
): Promise<{ ok: boolean }> {
  const res = await authFetch(
    `${participantsBase(projectId, reviewId)}/${participantId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ ok: boolean }>;
}

export type { ProjectReviewParticipantAttendanceStatus };
