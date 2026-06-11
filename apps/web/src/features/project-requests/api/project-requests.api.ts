import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';

export type UserSummaryDto = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
};

export type ProjectRequestDto = {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  status: string;
  urgency: string | null;
  estimatedBudget: number | null;
  expectedBenefits: string | null;
  businessContext: string | null;
  riskIfNotDone: string | null;
  requesterSummary: UserSummaryDto;
  validatorSummary: UserSummaryDto | null;
  decidedBySummary: UserSummaryDto | null;
  convertedProjectSummary: { id: string; name: string; code: string } | null;
  routingTarget: string | null;
  routingStatus: string;
  decisionComment: string | null;
  needsMoreInfoComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectRequestListResponse = {
  items: ProjectRequestDto[];
  total: number;
  page: number;
  limit: number;
};

export type WorkflowSettingsResponse = {
  stored: Record<string, unknown>;
  resolved: {
    defaultApprovedTarget: string;
    defaultGovernanceCycleId: string | null;
    validatorSelectionMode: string;
    allowRequesterToSelectValidator: boolean;
    allowValidatorToChooseRoutingTarget: boolean;
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

export async function submitProjectRequest(
  authFetch: AuthFetch,
  id: string,
): Promise<ProjectRequestDto> {
  const res = await authFetch(`${BASE}/${id}/submit`, { method: 'POST' });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRequestDto>;
}

export async function postProjectRequestDecision(
  authFetch: AuthFetch,
  id: string,
  body: { outcome: string; comment?: string },
): Promise<ProjectRequestDto> {
  const res = await authFetch(`${BASE}/${id}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRequestDto>;
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
