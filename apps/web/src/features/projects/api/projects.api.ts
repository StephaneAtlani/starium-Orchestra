import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type { Paginated, ResourceListItem } from '@/services/resources';
import type {
  CreateRetroplanMacroPayload,
  PaginatedList,
  ProjectActivityApi,
  ProjectArbitrationStatus,
  AssignableUsersResponse,
  ProjectAssignableUser,
  ProjectDetail,
  ProjectDocumentApi,
  ProjectMilestoneApi,
  ProjectRiskApi,
  RiskLinkedActionPlanTaskApi,
  ProjectSheet,
  ProjectTaskApi,
  ProjectTaskPhaseApi,
  ProjectTeamMemberApi,
  ProjectTeamRoleApi,
  ProjectsListResponse,
  ProjectsPortfolioSummary,
  ProjectSheetDecisionSnapshotDetail,
  ProjectSheetDecisionSnapshotListResponse,
  ProjectPortfolioCategoryNode,
  ProjectTag,
  RiskTaxonomyDomainApi,
  UpdateProjectSheetPayload,
} from '../types/project.types';

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

export async function getPortfolioSummary(
  authFetch: AuthFetch,
): Promise<ProjectsPortfolioSummary> {
  const res = await authFetch(`${BASE}/portfolio-summary`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectsPortfolioSummary>;
}

export async function listAssignableUsers(
  authFetch: AuthFetch,
): Promise<AssignableUsersResponse> {
  const res = await authFetch(`${BASE}/assignable-users`);
  if (!res.ok) throw await parseApiFormError(res);
  const raw: unknown = await res.json();
  if (Array.isArray(raw)) {
    return { users: raw as ProjectAssignableUser[], freePersons: [] };
  }
  return raw as AssignableUsersResponse;
}

/** Personnes (Resource HUMAN) pour sélecteur tâche / plan — `projects.read` (pas `resources.read`). */
export async function listHumanResourcesForTaskPickers(
  authFetch: AuthFetch,
): Promise<Paginated<ResourceListItem>> {
  const res = await authFetch(`${BASE}/options/human-resources`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Paginated<ResourceListItem>>;
}

export async function listProjects(
  authFetch: AuthFetch,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    kind?: string;
    status?: string;
    priority?: string;
    criticality?: string;
    portfolioCategoryId?: string;
    computedHealth?: 'GREEN' | 'ORANGE' | 'RED';
    myRole?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    atRiskOnly?: boolean;
    myProjectsOnly?: boolean;
  },
): Promise<ProjectsListResponse> {
  const res = await authFetch(`${BASE}${qs(params)}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectsListResponse>;
}

export async function getProject(
  authFetch: AuthFetch,
  id: string,
): Promise<ProjectDetail> {
  const res = await authFetch(`${BASE}/${id}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectDetail>;
}

export async function listProjectTags(authFetch: AuthFetch): Promise<ProjectTag[]> {
  const res = await authFetch(`${BASE}/options/tags`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTag[]>;
}

export async function listProjectPortfolioCategories(
  authFetch: AuthFetch,
): Promise<ProjectPortfolioCategoryNode[]> {
  const res = await authFetch(`${BASE}/options/portfolio-categories`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectPortfolioCategoryNode[]>;
}

export async function createProjectPortfolioCategory(
  authFetch: AuthFetch,
  body: {
    name: string;
    parentId?: string | null;
    color?: string | null;
    icon?: string | null;
    slug?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  },
): Promise<ProjectPortfolioCategoryNode> {
  const res = await authFetch(`${BASE}/options/portfolio-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectPortfolioCategoryNode>;
}

export async function updateProjectPortfolioCategory(
  authFetch: AuthFetch,
  categoryId: string,
  body: {
    name?: string;
    parentId?: string | null;
    color?: string | null;
    icon?: string | null;
    slug?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  },
): Promise<ProjectPortfolioCategoryNode> {
  const res = await authFetch(`${BASE}/options/portfolio-categories/${categoryId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectPortfolioCategoryNode>;
}

export async function reorderProjectPortfolioCategories(
  authFetch: AuthFetch,
  body: {
    parentId?: string | null;
    items: Array<{ id: string; sortOrder: number }>;
  },
): Promise<ProjectPortfolioCategoryNode[]> {
  const res = await authFetch(`${BASE}/options/portfolio-categories/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectPortfolioCategoryNode[]>;
}

export async function deleteProjectPortfolioCategory(
  authFetch: AuthFetch,
  categoryId: string,
): Promise<void> {
  const res = await authFetch(`${BASE}/options/portfolio-categories/${categoryId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}

export async function createProjectTag(
  authFetch: AuthFetch,
  body: { name: string; color?: string },
): Promise<ProjectTag> {
  const res = await authFetch(`${BASE}/options/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTag>;
}

export async function updateProjectTag(
  authFetch: AuthFetch,
  tagId: string,
  body: { name?: string; color?: string },
): Promise<ProjectTag> {
  const res = await authFetch(`${BASE}/options/tags/${tagId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTag>;
}

export async function deleteProjectTag(authFetch: AuthFetch, tagId: string): Promise<void> {
  const res = await authFetch(`${BASE}/options/tags/${tagId}`, { method: 'DELETE' });
  if (!res.ok) throw await parseApiFormError(res);
}

export async function getProjectTags(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectTag[]> {
  const res = await authFetch(`${BASE}/${projectId}/tags`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTag[]>;
}

export async function replaceProjectTags(
  authFetch: AuthFetch,
  projectId: string,
  tagIds: string[],
): Promise<ProjectTag[]> {
  const res = await authFetch(`${BASE}/${projectId}/tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagIds }),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTag[]>;
}

export async function createProject(
  authFetch: AuthFetch,
  body: Record<string, unknown>,
): Promise<ProjectDetail> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectDetail>;
}

export async function updateProject(
  authFetch: AuthFetch,
  id: string,
  body: Record<string, unknown>,
): Promise<ProjectDetail> {
  const res = await authFetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectDetail>;
}

export async function deleteProject(authFetch: AuthFetch, id: string): Promise<void> {
  const res = await authFetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw await parseApiFormError(res);
}

export async function listTasks(
  authFetch: AuthFetch,
  projectId: string,
): Promise<PaginatedList<ProjectTaskApi>> {
  const res = await authFetch(`${BASE}/${projectId}/tasks`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedList<ProjectTaskApi>>;
}

export type ProjectTaskChecklistItemPayload = {
  id?: string;
  title: string;
  isChecked?: boolean;
  sortOrder?: number;
};

export type CreateProjectTaskPayload = {
  name: string;
  description?: string;
  code?: string;
  status?: string;
  priority?: string;
  progress?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  phaseId?: string | null;
  dependsOnTaskId?: string | null;
  dependencyType?: string | null;
  ownerUserId?: string | null;
  budgetLineId?: string | null;
  bucketId?: string | null;
  sortOrder?: number;
  checklistItems?: ProjectTaskChecklistItemPayload[];
  taskLabelIds?: string[];
};

export type UpdateProjectTaskPayload = Partial<CreateProjectTaskPayload> & {
  description?: string | null;
  code?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  checklistItems?: ProjectTaskChecklistItemPayload[];
};

export async function createProjectTask(
  authFetch: AuthFetch,
  projectId: string,
  body: CreateProjectTaskPayload,
): Promise<ProjectTaskApi> {
  const res = await authFetch(`${BASE}/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTaskApi>;
}

export async function updateProjectTask(
  authFetch: AuthFetch,
  projectId: string,
  taskId: string,
  body: UpdateProjectTaskPayload,
): Promise<ProjectTaskApi> {
  const res = await authFetch(`${BASE}/${projectId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTaskApi>;
}

export async function listRisks(authFetch: AuthFetch, projectId: string) {
  const res = await authFetch(`${BASE}/${projectId}/risks`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRiskApi[]>;
}

export type RiskTaxonomyCatalogResponse = {
  domains: RiskTaxonomyDomainApi[];
};

export async function getRiskTaxonomyCatalog(
  authFetch: AuthFetch,
): Promise<RiskTaxonomyCatalogResponse> {
  const res = await authFetch('/api/risk-taxonomy/catalog');
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<RiskTaxonomyCatalogResponse>;
}

export type CreateProjectRiskPayload = {
  /** Rattachement — `POST/PATCH /api/risks` ; `null` = hors projet. */
  projectId?: string | null;
  title: string;
  description: string;
  code?: string;
  category?: string;
  riskTypeId: string;
  threatSource: string;
  businessImpact: string;
  likelihoodJustification?: string;
  impactCategory?: string | null;
  probability: number;
  impact: number;
  mitigationPlan?: string;
  contingencyPlan?: string;
  ownerUserId?: string | null;
  status?: string;
  reviewDate?: string | null;
  dueDate?: string | null;
  detectedAt?: string | null;
  complianceRequirementId?: string | null;
  treatmentStrategy: string;
  residualRiskLevel?: string | null;
  residualJustification?: string | null;
};

export type UpdateProjectRiskPayload = Partial<CreateProjectRiskPayload> & {
  /** `PATCH /api/risks/:id` — détacher avec `null`. */
  projectId?: string | null;
};

const RISKS_CLIENT_BASE = '/api/risks';

export async function listClientRisks(authFetch: AuthFetch): Promise<ProjectRiskApi[]> {
  const res = await authFetch(RISKS_CLIENT_BASE);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRiskApi[]>;
}

export async function createClientRisk(
  authFetch: AuthFetch,
  body: CreateProjectRiskPayload,
): Promise<ProjectRiskApi> {
  const res = await authFetch(RISKS_CLIENT_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRiskApi>;
}

export async function getClientRisk(authFetch: AuthFetch, riskId: string): Promise<ProjectRiskApi> {
  const res = await authFetch(`${RISKS_CLIENT_BASE}/${riskId}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRiskApi>;
}

/** Tâches plan d’actions liées à ce risque (EBIOS — lien « voir l’action »). */
export async function listRiskActionPlanTasks(
  authFetch: AuthFetch,
  riskId: string,
): Promise<{ items: RiskLinkedActionPlanTaskApi[] }> {
  const res = await authFetch(`${RISKS_CLIENT_BASE}/${riskId}/action-plan-tasks`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ items: RiskLinkedActionPlanTaskApi[] }>;
}

export async function updateClientRisk(
  authFetch: AuthFetch,
  riskId: string,
  body: UpdateProjectRiskPayload,
): Promise<ProjectRiskApi> {
  const res = await authFetch(`${RISKS_CLIENT_BASE}/${riskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRiskApi>;
}

export async function deleteClientRisk(authFetch: AuthFetch, riskId: string): Promise<void> {
  const res = await authFetch(`${RISKS_CLIENT_BASE}/${riskId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}

export async function createProjectRisk(
  authFetch: AuthFetch,
  projectId: string,
  body: CreateProjectRiskPayload,
): Promise<ProjectRiskApi> {
  const res = await authFetch(`${BASE}/${projectId}/risks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRiskApi>;
}

export async function getProjectRisk(
  authFetch: AuthFetch,
  projectId: string,
  riskId: string,
): Promise<ProjectRiskApi> {
  const res = await authFetch(`${BASE}/${projectId}/risks/${riskId}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRiskApi>;
}

export async function updateProjectRisk(
  authFetch: AuthFetch,
  projectId: string,
  riskId: string,
  body: UpdateProjectRiskPayload,
): Promise<ProjectRiskApi> {
  const res = await authFetch(`${BASE}/${projectId}/risks/${riskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRiskApi>;
}

export async function updateProjectRiskStatus(
  authFetch: AuthFetch,
  projectId: string,
  riskId: string,
  status: string,
): Promise<ProjectRiskApi> {
  const res = await authFetch(`${BASE}/${projectId}/risks/${riskId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectRiskApi>;
}

export async function deleteProjectRisk(
  authFetch: AuthFetch,
  projectId: string,
  riskId: string,
): Promise<void> {
  const res = await authFetch(`${BASE}/${projectId}/risks/${riskId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}

export async function listMilestones(
  authFetch: AuthFetch,
  projectId: string,
): Promise<PaginatedList<ProjectMilestoneApi>> {
  const res = await authFetch(`${BASE}/${projectId}/milestones`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedList<ProjectMilestoneApi>>;
}

export async function listProjectDocuments(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectDocumentApi[]> {
  const res = await authFetch(`${BASE}/${projectId}/documents`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectDocumentApi[]>;
}

export type CreateProjectMilestonePayload = {
  name: string;
  description?: string;
  code?: string;
  targetDate: string;
  achievedDate?: string;
  status?: string;
  linkedTaskId?: string | null;
  phaseId?: string | null;
  ownerUserId?: string | null;
  sortOrder?: number;
  milestoneLabelIds?: string[];
};

export type UpdateProjectMilestonePayload = Partial<CreateProjectMilestonePayload> & {
  description?: string | null;
  code?: string | null;
  achievedDate?: string | null;
};

export async function createProjectMilestone(
  authFetch: AuthFetch,
  projectId: string,
  body: CreateProjectMilestonePayload,
): Promise<ProjectMilestoneApi> {
  const res = await authFetch(`${BASE}/${projectId}/milestones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMilestoneApi>;
}

export async function updateProjectMilestone(
  authFetch: AuthFetch,
  projectId: string,
  milestoneId: string,
  body: UpdateProjectMilestonePayload,
): Promise<ProjectMilestoneApi> {
  const res = await authFetch(`${BASE}/${projectId}/milestones/${milestoneId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMilestoneApi>;
}

/** Tâche dans le payload Gantt (sous-ensemble des champs liste + isLate optionnel API). */
export type ProjectGanttTaskPayload = {
  id: string;
  phaseId: string | null;
  dependsOnTaskId: string | null;
  dependencyType: string | null;
  name: string;
  status: string;
  priority: string;
  progress: number;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  sortOrder: number;
  createdAt: string;
  isLate?: boolean;
};

export type ProjectGanttPayload = {
  projectId: string;
  /** Canonique — fallback normalisé si absent (rétrocompat). */
  project?: {
    id: string;
    name: string;
    status: string;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
  };
  phases: Array<{
    id: string;
    name: string;
    sortOrder: number;
    derivedStartDate: string | null;
    derivedEndDate: string | null;
    derivedDurationDays: number | null;
    derivedProgress: number | null;
    tasks: ProjectGanttTaskPayload[];
  }>;
  /** Legacy : liste plate (ordre Prisma) — fusionnée avec phases dans `normalizeProjectGanttPayload`. */
  tasks: ProjectGanttTaskPayload[];
  ungroupedTasks: Array<{
    id: string;
    phaseId: null;
    dependsOnTaskId: string | null;
    dependencyType: string | null;
    name: string;
    status: string;
    priority: string;
    progress: number;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
    actualStartDate: string | null;
    actualEndDate: string | null;
    sortOrder: number;
    createdAt: string;
    isLate?: boolean;
  }>;
  milestones: Array<{
    id: string;
    name: string;
    status: string;
    targetDate: string;
    linkedTaskId: string | null;
    phaseId: string | null;
    sortOrder: number;
    isLate?: boolean;
  }>;
};

export async function listProjectTaskPhases(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectTaskPhaseApi[]> {
  const res = await authFetch(`${BASE}/${projectId}/task-phases`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTaskPhaseApi[]>;
}

export async function createProjectTaskPhase(
  authFetch: AuthFetch,
  projectId: string,
  body: { name: string; sortOrder?: number },
): Promise<ProjectTaskPhaseApi> {
  const res = await authFetch(`${BASE}/${projectId}/task-phases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTaskPhaseApi>;
}

export async function getProjectGantt(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectGanttPayload> {
  const res = await authFetch(`${BASE}/${projectId}/gantt`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectGanttPayload>;
}

export async function listActivities(
  authFetch: AuthFetch,
  projectId: string,
): Promise<PaginatedList<ProjectActivityApi>> {
  const res = await authFetch(`${BASE}/${projectId}/activities`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedList<ProjectActivityApi>>;
}

export async function createRetroplanMacro(
  authFetch: AuthFetch,
  projectId: string,
  body: CreateRetroplanMacroPayload,
): Promise<ProjectMilestoneApi[]> {
  const res = await authFetch(`${BASE}/${projectId}/milestones/retroplan-macro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectMilestoneApi[]>;
}

export async function getProjectSheet(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectSheet> {
  const res = await authFetch(`${BASE}/${projectId}/project-sheet`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectSheet>;
}

export async function updateProjectSheet(
  authFetch: AuthFetch,
  projectId: string,
  body: UpdateProjectSheetPayload,
): Promise<ProjectSheet> {
  const res = await authFetch(`${BASE}/${projectId}/project-sheet`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectSheet>;
}

export async function listProjectSheetDecisionSnapshots(
  authFetch: AuthFetch,
  projectId: string,
  params?: { limit?: number; offset?: number },
): Promise<ProjectSheetDecisionSnapshotListResponse> {
  const res = await authFetch(
    `${BASE}/${projectId}/project-sheet/decision-snapshots${qs({
      limit: params?.limit,
      offset: params?.offset,
    })}`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectSheetDecisionSnapshotListResponse>;
}

export async function getProjectSheetDecisionSnapshot(
  authFetch: AuthFetch,
  projectId: string,
  snapshotId: string,
): Promise<ProjectSheetDecisionSnapshotDetail> {
  const res = await authFetch(
    `${BASE}/${projectId}/project-sheet/decision-snapshots/${snapshotId}`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectSheetDecisionSnapshotDetail>;
}

export async function postProjectArbitration(
  authFetch: AuthFetch,
  projectId: string,
  status: ProjectArbitrationStatus,
): Promise<ProjectSheet> {
  const res = await authFetch(`${BASE}/${projectId}/arbitration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectSheet>;
}

export async function listProjectTeamRoles(
  authFetch: AuthFetch,
): Promise<ProjectTeamRoleApi[]> {
  const res = await authFetch(`${BASE}/team-roles`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTeamRoleApi[]>;
}

export async function createProjectTeamRole(
  authFetch: AuthFetch,
  body: { name: string; sortOrder?: number },
): Promise<ProjectTeamRoleApi> {
  const res = await authFetch(`${BASE}/team-roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTeamRoleApi>;
}

export async function updateProjectTeamRole(
  authFetch: AuthFetch,
  roleId: string,
  body: { name?: string; sortOrder?: number },
): Promise<ProjectTeamRoleApi> {
  const res = await authFetch(`${BASE}/team-roles/${roleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTeamRoleApi>;
}

export async function deleteProjectTeamRole(
  authFetch: AuthFetch,
  roleId: string,
): Promise<void> {
  const res = await authFetch(`${BASE}/team-roles/${roleId}`, { method: 'DELETE' });
  if (!res.ok) throw await parseApiFormError(res);
}

export async function getProjectTeam(
  authFetch: AuthFetch,
  projectId: string,
): Promise<ProjectTeamMemberApi[]> {
  const res = await authFetch(`${BASE}/${projectId}/team`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTeamMemberApi[]>;
}

export type AddProjectTeamMemberPayload =
  | { roleId: string; userId: string }
  | {
      roleId: string;
      freeLabel: string;
      affiliation: 'INTERNAL' | 'EXTERNAL';
    };

export async function addProjectTeamMember(
  authFetch: AuthFetch,
  projectId: string,
  body: AddProjectTeamMemberPayload,
): Promise<ProjectTeamMemberApi> {
  const res = await authFetch(`${BASE}/${projectId}/team`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProjectTeamMemberApi>;
}

export async function removeProjectTeamMember(
  authFetch: AuthFetch,
  projectId: string,
  memberId: string,
): Promise<void> {
  const res = await authFetch(`${BASE}/${projectId}/team/${memberId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}

const TAXONOMY = '/api/risk-taxonomy';

export type RiskTaxonomyAdminDomain = {
  id: string;
  clientId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  types: Array<{
    id: string;
    clientId: string;
    domainId: string;
    code: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
};

export async function listRiskTaxonomyAdminDomains(
  authFetch: AuthFetch,
): Promise<RiskTaxonomyAdminDomain[]> {
  const res = await authFetch(`${TAXONOMY}/admin/domains`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<RiskTaxonomyAdminDomain[]>;
}

export async function createRiskTaxonomyDomain(
  authFetch: AuthFetch,
  body: { code: string; name: string; description?: string | null; isActive?: boolean },
): Promise<{ id: string }> {
  const res = await authFetch(`${TAXONOMY}/admin/domains`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}

export async function updateRiskTaxonomyDomain(
  authFetch: AuthFetch,
  domainId: string,
  body: Partial<{ code: string; name: string; description: string | null; isActive: boolean }>,
): Promise<unknown> {
  const res = await authFetch(`${TAXONOMY}/admin/domains/${domainId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}

export async function createRiskTaxonomyType(
  authFetch: AuthFetch,
  domainId: string,
  body: { code: string; name: string; isActive?: boolean },
): Promise<{ id: string }> {
  const res = await authFetch(`${TAXONOMY}/admin/domains/${domainId}/types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}

export async function updateRiskTaxonomyType(
  authFetch: AuthFetch,
  typeId: string,
  body: Partial<{ code: string; name: string; isActive: boolean }>,
): Promise<unknown> {
  const res = await authFetch(`${TAXONOMY}/admin/types/${typeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json();
}
