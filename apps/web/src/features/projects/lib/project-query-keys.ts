import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';

export const projectQueryKeys = {
  all: ['projects'] as const,
  summary: (clientId: string) => [...projectQueryKeys.all, 'summary', clientId] as const,
  assignableUsers: (clientId: string) =>
    [...projectQueryKeys.all, 'assignable-users', clientId] as const,
  list: (clientId: string, params: ProjectsListFilters | Record<string, unknown>) =>
    [...projectQueryKeys.all, 'list', clientId, params] as const,
  detail: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'detail', clientId, projectId] as const,
  optionsTags: (clientId: string) =>
    [...projectQueryKeys.all, 'options-tags', clientId] as const,
  optionsPortfolioCategories: (clientId: string) =>
    [...projectQueryKeys.all, 'options-portfolio-categories', clientId] as const,
  projectTags: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'project-tags', clientId, projectId] as const,
  sheet: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'sheet', clientId, projectId] as const,
  tasks: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'tasks', clientId, projectId] as const,
  taskBuckets: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'task-buckets', clientId, projectId] as const,
  taskLabels: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'task-labels', clientId, projectId] as const,
  risks: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'risks', clientId, projectId] as const,
  /** Agrégation client — liste transverse /risks (MVP). Invalider après mutation risque sur un projet. */
  risksRegistry: (clientId: string) =>
    [...projectQueryKeys.all, 'risks-registry', clientId] as const,
  /** `GET /api/risks` — registre client-scoped. */
  clientRisks: (clientId: string) =>
    [...projectQueryKeys.all, 'client-risks', clientId] as const,
  /** Tâches de plan liées à un risque — `GET /api/risks/:riskId/action-plan-tasks`. */
  riskActionPlanTasks: (clientId: string, riskId: string) =>
    [...projectQueryKeys.all, 'risk-action-plan-tasks', clientId, riskId] as const,
  /** Phase 1 seule (méta projets paginés) — filtres / libellés projet. */
  risksRegistryProjects: (clientId: string) =>
    [...projectQueryKeys.all, 'risks-registry', 'projects', clientId] as const,
  riskDetail: (clientId: string, projectId: string, riskId: string) =>
    [...projectQueryKeys.all, 'risk-detail', clientId, projectId, riskId] as const,
  /** Détail via `GET /api/risks/:riskId` (registre transverse). */
  clientRiskDetail: (clientId: string, riskId: string) =>
    [...projectQueryKeys.all, 'client-risk-detail', clientId, riskId] as const,
  milestones: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'milestones', clientId, projectId] as const,
  milestoneLabels: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'milestone-labels', clientId, projectId] as const,
  documents: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'documents', clientId, projectId] as const,
  gantt: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'gantt', clientId, projectId] as const,
  budgetLinks: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'budget-links', clientId, projectId] as const,
  teamRoles: (clientId: string) =>
    [...projectQueryKeys.all, 'team-roles', clientId] as const,
  team: (clientId: string, projectId: string) =>
    [...projectQueryKeys.all, 'team', clientId, projectId] as const,
  sheetDecisionSnapshots: (
    clientId: string,
    projectId: string,
    params: { limit: number; offset: number },
  ) =>
    [...projectQueryKeys.all, 'project', projectId, 'sheet-decision-snapshots', clientId, params] as const,
  sheetDecisionSnapshot: (clientId: string, projectId: string, snapshotId: string) =>
    [...projectQueryKeys.all, 'project', projectId, 'sheet-decision-snapshot', snapshotId, clientId] as const,
  /** RFC-PROJ-013 */
  reviews: (clientId: string, projectId: string) =>
    ['project', projectId, 'reviews', clientId] as const,
  review: (clientId: string, projectId: string, reviewId: string) =>
    ['project', projectId, 'review', reviewId, clientId] as const,

  /** RFC-PLA-001 */
  actionPlansList: (clientId: string, params: Record<string, unknown>) =>
    [...projectQueryKeys.all, 'action-plans', clientId, params] as const,
  actionPlanDetail: (clientId: string, actionPlanId: string) =>
    [...projectQueryKeys.all, 'action-plan', clientId, actionPlanId] as const,
  actionPlanTasks: (
    clientId: string,
    actionPlanId: string,
    params: Record<string, unknown>,
  ) =>
    [...projectQueryKeys.all, 'action-plan-tasks', clientId, actionPlanId, params] as const,
};
