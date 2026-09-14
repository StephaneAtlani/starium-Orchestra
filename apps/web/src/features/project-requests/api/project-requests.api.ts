import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';

export type UserSummaryDto = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
};

export type ComputedCircuitDto = {
  needsCycle: boolean;
  instance: 'COPIL' | 'CODIR' | null;
  budgetForRouting: number;
  steps: Array<{ key: string; label: string; actorHint: string; circuitStep: string }>;
  copilThresholdAmount: number;
  codirThresholdAmount: number;
  instructionSlaBusinessDays: number;
  requireN1Validation: boolean;
  requirePmoInstruction: boolean;
  autoCreateProjectOnApproval: boolean;
  exemptRequestTypes: string[];
};

export type JournalEntryDto = {
  id: string;
  label: string;
  authorLabel: string;
  authorUserId: string | null;
  at: string;
  authorSummary: UserSummaryDto | null;
};

export type ProjectRequestDto = {
  id: string;
  clientId: string;
  referenceCode: string | null;
  title: string;
  description: string | null;
  type: string | null;
  portfolioCategoryId?: string | null;
  portfolioCategory?: {
    id: string;
    name: string;
    parentId: string | null;
    parentName: string | null;
    color: string | null;
    icon: string | null;
  } | null;
  requestingDirection: string | null;
  sponsorLabel: string | null;
  status: string;
  urgency: string | null;
  priorityRequested: string | null;
  estimatedBudget: number | null;
  estimatedEffortDays: number | null;
  retainedBudget: number | null;
  retainedEffortDays: number | null;
  desiredDeadline: string | null;
  objectives: string[];
  expectedBenefits: string | null;
  businessContext: string | null;
  riskIfNotDone: string | null;
  expectedOutcome?: string | null;
  affectedScope?: string | null;
  affectedUsersCount?: number | null;
  deadlineRationale?: string | null;
  knownConstraints?: string | null;
  solutionsTried?: string | null;
  strategicObjectiveLabel?: string | null;
  swot?: {
    strengths?: string;
    weaknesses?: string;
    opportunities?: string;
    threats?: string;
  } | null;
  tows?: {
    so?: string;
    wo?: string;
    st?: string;
    wt?: string;
  } | null;
  budgetUnknown?: boolean;
  effortUnknown?: boolean;
  instructionOpinion: string | null;
  instructionSummary: string | null;
  failedAtStep: string | null;
  arbitrationInstance: string | null;
  meetingLabel: string | null;
  meetingRef: string | null;
  requesterSummary: UserSummaryDto;
  validatorSummary: UserSummaryDto | null;
  decidedBySummary: UserSummaryDto | null;
  convertedProjectSummary: { id: string; name: string; code: string } | null;
  routingTarget: string | null;
  routingStatus: string;
  decisionComment: string | null;
  needsMoreInfoComment: string | null;
  journal?: JournalEntryDto[];
  computedCircuit?: ComputedCircuitDto;
  createdAt: string;
  updatedAt: string;
};

export type ProjectRequestListResponse = {
  items: ProjectRequestDto[];
  total: number;
  page: number;
  limit: number;
};

export type ProjectRequestSummaryDto = {
  toInstruct: number;
  inCycle: number;
  toConvert: number;
  envelopeInCircuit: number;
  copilThresholdAmount: number;
  codirThresholdAmount: number;
  requireN1Validation: boolean;
  requirePmoInstruction: boolean;
  autoCreateProjectOnApproval: boolean;
  exemptRequestTypes: string[];
  instructionSlaBusinessDays: number;
};

export type WorkflowSettingsResponse = {
  stored: Record<string, unknown>;
  resolved: {
    defaultApprovedTarget: string;
    defaultGovernanceCycleId: string | null;
    validatorSelectionMode: string;
    allowRequesterToSelectValidator: boolean;
    allowValidatorToChooseRoutingTarget: boolean;
    copilThresholdAmount: number;
    codirThresholdAmount: number;
    instructionSlaBusinessDays: number;
    requireN1Validation: boolean;
    requirePmoInstruction: boolean;
    autoCreateProjectOnApproval: boolean;
    exemptRequestTypes: string[];
  };
  options: {
    governanceCyclesModuleEnabled: boolean;
    governanceCycles: Array<{
      id: string;
      name: string;
      code: string | null;
      status: string;
      activeForProjectRequestPool: boolean;
    }>;
    pilotingCycleTargetAvailable: boolean;
    selectedGovernanceCycleActive: boolean;
  };
};

const BASE = '/api/project-requests';

async function postAction(
  authFetch: AuthFetch,
  id: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<ProjectRequestDto> {
  const res = await authFetch(`${BASE}/${id}/${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRequestDto>;
}

export async function listProjectRequests(
  authFetch: AuthFetch,
  params?: { status?: string; search?: string; page?: number; limit?: number },
): Promise<ProjectRequestListResponse> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.search) search.set('search', params.search);
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  const qs = search.toString();
  const res = await authFetch(`${BASE}${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRequestListResponse>;
}

export async function fetchProjectRequestSummary(
  authFetch: AuthFetch,
): Promise<ProjectRequestSummaryDto> {
  const res = await authFetch(`${BASE}/summary`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRequestSummaryDto>;
}

export async function previewCircuit(
  authFetch: AuthFetch,
  params: { type?: string; budget?: number },
): Promise<ComputedCircuitDto> {
  const search = new URLSearchParams();
  if (params.type) search.set('type', params.type);
  if (params.budget != null) search.set('budget', String(params.budget));
  const res = await authFetch(`${BASE}/preview-circuit?${search.toString()}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ComputedCircuitDto>;
}

export async function getProjectRequest(
  authFetch: AuthFetch,
  id: string,
): Promise<ProjectRequestDto> {
  const res = await authFetch(`${BASE}/${id}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRequestDto>;
}

export async function createProjectRequest(
  authFetch: AuthFetch,
  body: Record<string, unknown>,
): Promise<ProjectRequestDto> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRequestDto>;
}

export async function updateProjectRequest(
  authFetch: AuthFetch,
  id: string,
  body: Record<string, unknown>,
): Promise<ProjectRequestDto> {
  const res = await authFetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRequestDto>;
}

export async function submitProjectRequest(authFetch: AuthFetch, id: string) {
  return postAction(authFetch, id, 'submit');
}

export async function n1DecideProjectRequest(
  authFetch: AuthFetch,
  id: string,
  body: { outcome: 'APPROVE' | 'REJECT'; comment?: string },
) {
  return postAction(authFetch, id, 'n1-decide', body);
}

export async function instructProjectRequest(
  authFetch: AuthFetch,
  id: string,
  body: Record<string, unknown>,
) {
  return postAction(authFetch, id, 'instruct', body);
}

export async function agendaProjectRequest(
  authFetch: AuthFetch,
  id: string,
  body: Record<string, unknown>,
) {
  return postAction(authFetch, id, 'agenda', body);
}

export async function committeeDecideProjectRequest(
  authFetch: AuthFetch,
  id: string,
  body: { outcome: 'APPROVE' | 'POSTPONE' | 'REJECT'; motivation?: string },
) {
  return postAction(authFetch, id, 'committee-decide', body);
}

export async function convertProjectRequest(authFetch: AuthFetch, id: string) {
  return postAction(authFetch, id, 'convert');
}

export async function reopenProjectRequest(authFetch: AuthFetch, id: string) {
  return postAction(authFetch, id, 'reopen');
}

export async function postProjectRequestDecision(
  authFetch: AuthFetch,
  id: string,
  body: { outcome: string; comment?: string },
): Promise<ProjectRequestDto> {
  return postAction(authFetch, id, 'decision', body);
}

export async function fetchValidatorOptions(
  authFetch: AuthFetch,
): Promise<UserSummaryDto[]> {
  const res = await authFetch(`${BASE}/validator-options`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<UserSummaryDto[]>;
}

export async function fetchWorkflowSettings(
  authFetch: AuthFetch,
): Promise<WorkflowSettingsResponse> {
  const res = await authFetch(
    '/api/clients/active/project-request-workflow-settings',
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<WorkflowSettingsResponse>;
}

export async function patchWorkflowSettings(
  authFetch: AuthFetch,
  body: Record<string, unknown>,
): Promise<WorkflowSettingsResponse> {
  const res = await authFetch(
    '/api/clients/active/project-request-workflow-settings',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<WorkflowSettingsResponse>;
}
