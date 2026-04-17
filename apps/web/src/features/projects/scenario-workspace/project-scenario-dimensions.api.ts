import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  PaginatedScenario,
  ProjectScenarioCapacityRecomputeApi,
  ProjectScenarioCapacitySnapshotApi,
  ProjectScenarioCapacitySummaryApi,
  ProjectScenarioFinancialLineApi,
  ProjectScenarioFinancialSummaryApi,
  ProjectScenarioResourcePlanApi,
  ProjectScenarioResourceSummaryApi,
  ProjectScenarioRiskApi,
  ProjectScenarioTaskApi,
  ProjectScenarioTaskType,
  ProjectScenarioTimelineSummaryApi,
  ProjectScenarioRiskSummaryApi,
  ScenarioBootstrapFromPlanApi,
} from './project-scenario-dimensions.types';

const BASE = '/api/projects';

function qs(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

function scenarioPath(projectId: string, scenarioId: string, sub: string): string {
  return `${BASE}/${projectId}/scenarios/${scenarioId}${sub}`;
}

// —— Budget (RFC-PROJ-SC-002) ——

export async function listProjectScenarioFinancialLines(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  params?: { limit?: number; offset?: number },
): Promise<PaginatedScenario<ProjectScenarioFinancialLineApi>> {
  const res = await authFetch(
    `${scenarioPath(projectId, scenarioId, '/financial-lines')}${qs(params)}`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedScenario<ProjectScenarioFinancialLineApi>>;
}

export type CreateProjectScenarioFinancialLinePayload = {
  projectBudgetLinkId?: string;
  budgetLineId?: string;
  label: string;
  costCategory?: string | null;
  amountPlanned: string;
  amountForecast?: string | null;
  amountActual?: string | null;
  currencyCode?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
};

export async function createProjectScenarioFinancialLine(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  payload: CreateProjectScenarioFinancialLinePayload,
): Promise<ProjectScenarioFinancialLineApi> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, '/financial-lines'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioFinancialLineApi>;
}

export type UpdateProjectScenarioFinancialLinePayload = Partial<CreateProjectScenarioFinancialLinePayload>;

export async function updateProjectScenarioFinancialLine(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  lineId: string,
  payload: UpdateProjectScenarioFinancialLinePayload,
): Promise<ProjectScenarioFinancialLineApi> {
  const res = await authFetch(
    scenarioPath(projectId, scenarioId, `/financial-lines/${lineId}`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioFinancialLineApi>;
}

export async function deleteProjectScenarioFinancialLine(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  lineId: string,
): Promise<void> {
  const res = await authFetch(
    scenarioPath(projectId, scenarioId, `/financial-lines/${lineId}`),
    { method: 'DELETE' },
  );
  if (!res.ok) throw await parseApiFormError(res);
}

export async function getProjectScenarioFinancialSummary(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
): Promise<ProjectScenarioFinancialSummaryApi> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, '/financial-summary'));
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioFinancialSummaryApi>;
}

// —— Ressources (RFC-PROJ-SC-003 backend) ——

export type CreateProjectScenarioResourcePlanPayload = {
  resourceId: string;
  roleLabel?: string | null;
  allocationPct?: string | null;
  plannedDays?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
};

export async function listProjectScenarioResourcePlans(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  params?: { limit?: number; offset?: number },
): Promise<PaginatedScenario<ProjectScenarioResourcePlanApi>> {
  const res = await authFetch(
    `${scenarioPath(projectId, scenarioId, '/resource-plans')}${qs(params)}`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedScenario<ProjectScenarioResourcePlanApi>>;
}

export async function createProjectScenarioResourcePlan(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  payload: CreateProjectScenarioResourcePlanPayload,
): Promise<ProjectScenarioResourcePlanApi> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, '/resource-plans'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioResourcePlanApi>;
}

export async function updateProjectScenarioResourcePlan(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  planId: string,
  payload: Partial<CreateProjectScenarioResourcePlanPayload>,
): Promise<ProjectScenarioResourcePlanApi> {
  const res = await authFetch(
    scenarioPath(projectId, scenarioId, `/resource-plans/${planId}`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioResourcePlanApi>;
}

export async function deleteProjectScenarioResourcePlan(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  planId: string,
): Promise<void> {
  const res = await authFetch(
    scenarioPath(projectId, scenarioId, `/resource-plans/${planId}`),
    { method: 'DELETE' },
  );
  if (!res.ok) throw await parseApiFormError(res);
}

export async function getProjectScenarioResourceSummary(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
): Promise<ProjectScenarioResourceSummaryApi> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, '/resource-summary'));
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioResourceSummaryApi>;
}

// —— Planning tâches (RFC-PROJ-SC-004) ——

export type CreateProjectScenarioTaskPayload = {
  title: string;
  taskType?: ProjectScenarioTaskType | null;
  startDate?: string | null;
  endDate?: string | null;
  durationDays?: number | null;
  dependencyIds?: string[] | null;
  orderIndex?: number;
};

export async function listProjectScenarioTasks(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  params?: { limit?: number; offset?: number },
): Promise<PaginatedScenario<ProjectScenarioTaskApi>> {
  const res = await authFetch(`${scenarioPath(projectId, scenarioId, '/tasks')}${qs(params)}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedScenario<ProjectScenarioTaskApi>>;
}

export async function createProjectScenarioTask(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  payload: CreateProjectScenarioTaskPayload,
): Promise<ProjectScenarioTaskApi> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, '/tasks'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioTaskApi>;
}

export async function updateProjectScenarioTask(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  taskId: string,
  payload: Partial<CreateProjectScenarioTaskPayload>,
): Promise<ProjectScenarioTaskApi> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, `/tasks/${taskId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioTaskApi>;
}

export async function deleteProjectScenarioTask(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  taskId: string,
): Promise<void> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, `/tasks/${taskId}`), {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}

export async function bootstrapProjectScenarioTasksFromPlan(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
): Promise<ScenarioBootstrapFromPlanApi> {
  const res = await authFetch(
    scenarioPath(projectId, scenarioId, '/bootstrap-from-project-plan'),
    { method: 'POST' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ScenarioBootstrapFromPlanApi>;
}

export async function getProjectScenarioTimelineSummary(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
): Promise<ProjectScenarioTimelineSummaryApi> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, '/timeline-summary'));
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioTimelineSummaryApi>;
}

// —— Capacité (RFC-PROJ-SC-005) ——

export async function listProjectScenarioCapacitySnapshots(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  params?: { limit?: number; offset?: number; resourceId?: string },
): Promise<PaginatedScenario<ProjectScenarioCapacitySnapshotApi>> {
  const res = await authFetch(`${scenarioPath(projectId, scenarioId, '/capacity')}${qs(params)}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedScenario<ProjectScenarioCapacitySnapshotApi>>;
}

export async function getProjectScenarioCapacitySummary(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
): Promise<ProjectScenarioCapacitySummaryApi> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, '/capacity-summary'));
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioCapacitySummaryApi>;
}

export async function recomputeProjectScenarioCapacity(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
): Promise<ProjectScenarioCapacityRecomputeApi> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, '/capacity/recompute'), {
    method: 'POST',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioCapacityRecomputeApi>;
}

// —— Risques scénario (RFC-PROJ-SC-006) ——

export type CreateProjectScenarioRiskPayload = {
  riskTypeId?: string;
  title: string;
  description?: string;
  probability: number;
  impact: number;
  mitigationPlan?: string;
  ownerLabel?: string;
};

export async function listProjectScenarioRisks(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  params?: { limit?: number; offset?: number },
): Promise<PaginatedScenario<ProjectScenarioRiskApi>> {
  const res = await authFetch(`${scenarioPath(projectId, scenarioId, '/risks')}${qs(params)}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedScenario<ProjectScenarioRiskApi>>;
}

export async function createProjectScenarioRisk(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  payload: CreateProjectScenarioRiskPayload,
): Promise<ProjectScenarioRiskApi> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, '/risks'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioRiskApi>;
}

export async function updateProjectScenarioRisk(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  riskId: string,
  payload: Partial<CreateProjectScenarioRiskPayload>,
): Promise<ProjectScenarioRiskApi> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, `/risks/${riskId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioRiskApi>;
}

export async function deleteProjectScenarioRisk(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
  riskId: string,
): Promise<void> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, `/risks/${riskId}`), {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}

export async function getProjectScenarioRiskSummary(
  authFetch: AuthFetch,
  projectId: string,
  scenarioId: string,
): Promise<ProjectScenarioRiskSummaryApi> {
  const res = await authFetch(scenarioPath(projectId, scenarioId, '/risk-summary'));
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectScenarioRiskSummaryApi>;
}
