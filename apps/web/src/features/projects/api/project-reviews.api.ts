import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  InviteProjectReviewPayload,
  InviteProjectReviewResult,
  ProjectReviewAgendaItemApi,
  ProjectReviewAttachmentApi,
  ProjectReviewDetail,
  ProjectReviewEscalationApi,
  ProjectReviewEscalationsListResponse,
  CreateProjectReviewEscalationPayload,
  ConsolidateEscalationsResult,
  ProjectReviewDescentApi,
  ProjectReviewDescentsListResponse,
  ConsolidateDescentsResult,
  ProjectReviewListResponse,
  ProjectReviewParticipantApi,
  ProjectReviewParticipantAttendanceStatus,
  ProjectReviewsSummaryResponse,
  ProjectReviewSeriesApi,
} from '../types/project.types';

const base = (projectId: string) => `/api/projects/${projectId}/reviews`;
const seriesBase = (projectId: string) =>
  `/api/projects/${projectId}/review-series`;

export async function listProjectReviews(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectReviewListResponse> {
  const res = await authFetch(base(projectId));
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewListResponse>;
}

export async function getProjectReviewsSummary(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectReviewsSummaryResponse> {
  const res = await authFetch(`${base(projectId)}/summary`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewsSummaryResponse>;
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

export async function scheduleProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  body: { reviewDate: string },
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/schedule`, {
    method: 'POST',
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
  const res = await authFetch(`${base(projectId)}/${reviewId}/start`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function finalizeProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  body?: { pushActionsToTasks?: boolean; promoteRiskNotes?: boolean },
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function closeConductProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/close-conduct`, {
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

export async function reopenProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/reopen`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function inviteProjectReview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  body?: InviteProjectReviewPayload,
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

export async function deleteProjectReviewAgendaItem(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  agendaItemId: string,
): Promise<{ ok: boolean }> {
  const res = await authFetch(
    `${agendaBase(projectId, reviewId)}/${agendaItemId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ ok: boolean }>;
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

export type ConveneTeamParticipantsResponse = {
  teamId: string;
  teamName: string;
  addedCount: number;
  added: ProjectReviewParticipantApi[];
  message: string;
};

/** RFC-PROJ-023 — convoquer une équipe dans les participants du point. */
export async function conveneProjectReviewTeam(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  body: { teamId: string },
): Promise<ConveneTeamParticipantsResponse> {
  const res = await authFetch(
    `${participantsBase(projectId, reviewId)}/convene-team`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ConveneTeamParticipantsResponse>;
}

export type { ProjectReviewParticipantAttendanceStatus };

const attachmentsBase = (projectId: string, reviewId: string) =>
  `${base(projectId)}/${reviewId}/attachments`;

export async function createProjectReviewAttachment(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  body: Record<string, unknown>,
): Promise<ProjectReviewAttachmentApi> {
  const res = await authFetch(attachmentsBase(projectId, reviewId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewAttachmentApi>;
}

export async function updateProjectReviewAttachment(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  attachmentId: string,
  body: Record<string, unknown>,
): Promise<ProjectReviewAttachmentApi> {
  const res = await authFetch(
    `${attachmentsBase(projectId, reviewId)}/${attachmentId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewAttachmentApi>;
}

export async function deleteProjectReviewAttachment(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  attachmentId: string,
): Promise<{ ok: boolean }> {
  const res = await authFetch(
    `${attachmentsBase(projectId, reviewId)}/${attachmentId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ ok: boolean }>;
}

export type ProjectReviewReportPreview = {
  subject: string;
  title: string;
  text: string;
  html: string;
};

export type SendProjectReviewReportResult = {
  emailed: number;
  skippedNoEmail: number;
  emailFailed: number;
  emailDisabled?: boolean;
  emailedParticipantIds: string[];
};

export async function getProjectReviewReportPreview(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewReportPreview> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/report-preview`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewReportPreview>;
}

export async function sendProjectReviewReport(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<SendProjectReviewReportResult> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/send-report`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<SendProjectReviewReportResult>;
}

export async function lockProjectReviewAgenda(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/lock-agenda`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function unlockProjectReviewAgenda(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewDetail> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/unlock-agenda`, {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDetail>;
}

export async function listProjectReviewSeries(
  authFetch: AuthFetch,
  projectId: string,
): Promise<{ items: ProjectReviewSeriesApi[] }> {
  const res = await authFetch(seriesBase(projectId));
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ items: ProjectReviewSeriesApi[] }>;
}

export async function createProjectReviewSeries(
  authFetch: AuthFetch,
  projectId: string,
  body: Record<string, unknown>,
): Promise<ProjectReviewSeriesApi> {
  const res = await authFetch(seriesBase(projectId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewSeriesApi>;
}

export async function updateProjectReviewSeries(
  authFetch: AuthFetch,
  projectId: string,
  seriesId: string,
  body: Record<string, unknown>,
): Promise<ProjectReviewSeriesApi> {
  const res = await authFetch(`${seriesBase(projectId)}/${seriesId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewSeriesApi>;
}

export async function generateProjectReviewSeries(
  authFetch: AuthFetch,
  projectId: string,
  seriesId: string,
  body?: { count?: number },
): Promise<{
  created: number;
  skipped: number;
  items: Array<{
    id: string;
    title: string | null;
    reviewDate: string | null;
    reviewType: string;
    status: string;
    seriesId: string | null;
  }>;
}> {
  const res = await authFetch(`${seriesBase(projectId)}/${seriesId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}

/** RFC-PROJ-013-8 F3 */
export async function listProjectReviewEscalations(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewEscalationsListResponse> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/escalations`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewEscalationsListResponse>;
}

export async function createProjectReviewEscalation(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  body: CreateProjectReviewEscalationPayload,
): Promise<ProjectReviewEscalationApi> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/escalations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewEscalationApi>;
}

export async function cancelProjectReviewEscalation(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  escalationId: string,
): Promise<ProjectReviewEscalationApi> {
  const res = await authFetch(
    `${base(projectId)}/${reviewId}/escalations/${escalationId}/cancel`,
    { method: 'POST' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewEscalationApi>;
}

export async function consolidateProjectReviewEscalations(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ConsolidateEscalationsResult> {
  const res = await authFetch(
    `${base(projectId)}/${reviewId}/consolidate-escalations`,
    { method: 'POST' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ConsolidateEscalationsResult>;
}

/** RFC-PROJ-013-8 F3.1 */
export async function listProjectReviewDescents(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ProjectReviewDescentsListResponse> {
  const res = await authFetch(`${base(projectId)}/${reviewId}/descents`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDescentsListResponse>;
}

export async function cancelProjectReviewDescent(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
  descentId: string,
): Promise<ProjectReviewDescentApi> {
  const res = await authFetch(
    `${base(projectId)}/${reviewId}/descents/${descentId}/cancel`,
    { method: 'POST' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewDescentApi>;
}

export async function consolidateProjectReviewDescents(
  authFetch: AuthFetch,
  projectId: string,
  reviewId: string,
): Promise<ConsolidateDescentsResult> {
  const res = await authFetch(
    `${base(projectId)}/${reviewId}/consolidate-descents`,
    { method: 'POST' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ConsolidateDescentsResult>;
}

export type ProjectReviewPrepareTemplateApi = {
  id: string;
  name: string;
  typeCode: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const prepareTemplatesBase = (projectId: string) =>
  `${base(projectId)}/prepare-templates`;

export async function listProjectReviewPrepareTemplates(
  authFetch: AuthFetch,
  projectId: string,
  typeCode?: string,
): Promise<{ items: ProjectReviewPrepareTemplateApi[] }> {
  const qs = typeCode
    ? `?typeCode=${encodeURIComponent(typeCode)}`
    : '';
  const res = await authFetch(`${prepareTemplatesBase(projectId)}${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ items: ProjectReviewPrepareTemplateApi[] }>;
}

export async function createProjectReviewPrepareTemplate(
  authFetch: AuthFetch,
  projectId: string,
  body: {
    name: string;
    typeCode: string;
    payload: Record<string, unknown>;
  },
): Promise<ProjectReviewPrepareTemplateApi> {
  const res = await authFetch(prepareTemplatesBase(projectId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewPrepareTemplateApi>;
}

export async function updateProjectReviewPrepareTemplate(
  authFetch: AuthFetch,
  projectId: string,
  templateId: string,
  body: { name?: string; payload?: Record<string, unknown> },
): Promise<ProjectReviewPrepareTemplateApi> {
  const res = await authFetch(
    `${prepareTemplatesBase(projectId)}/${templateId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectReviewPrepareTemplateApi>;
}

export async function deleteProjectReviewPrepareTemplate(
  authFetch: AuthFetch,
  projectId: string,
  templateId: string,
): Promise<{ ok: boolean }> {
  const res = await authFetch(
    `${prepareTemplatesBase(projectId)}/${templateId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ ok: boolean }>;
}
