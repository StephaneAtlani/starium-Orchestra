export type ProjectsListUrlFilters = {
  status?: string;
  computedHealth?: 'GREEN' | 'ORANGE' | 'RED';
  atRiskOnly?: boolean;
  /** Aligné sur le KPI portefeuille `lateProjects` (`signals.isLate`). */
  lateOnly?: boolean;
};

export function projectsList(filters?: ProjectsListUrlFilters): string {
  if (!filters) return '/projects';
  const search = new URLSearchParams();
  if (filters.status) search.set('status', filters.status);
  if (filters.computedHealth) search.set('computedHealth', filters.computedHealth);
  if (filters.atRiskOnly) search.set('atRiskOnly', '1');
  if (filters.lateOnly) search.set('lateOnly', '1');
  const q = search.toString();
  return q ? `/projects?${q}` : '/projects';
}

/** Frise Gantt portefeuille (tous les projets filtrés). */
export function projectsPortfolioGantt(): string {
  return '/projects/portfolio-gantt';
}

/** Mode présentation CODIR — portefeuille multi-projets (plein écran, navigation diaporama). */
export function projectsCommitteeCodir(): string {
  return '/projects/committee/codir';
}

/** Options / paramètres module Projets (placeholder). */
export function projectsOptions(): string {
  return '/projects/options';
}

export function projectNew(): string {
  return '/projects/new';
}

export function projectDetail(id: string): string {
  return `/projects/${id}`;
}

export function projectSheet(projectId: string): string {
  return `/projects/${projectId}/sheet`;
}

/** Tâches projet : liste/table + Kanban (RFC-PROJ-012). */
export function projectTasks(
  projectId: string,
  sub?: 'tasks' | 'kanban',
): string {
  const base = `/projects/${projectId}/tasks`;
  if (!sub || sub === 'tasks') return `${base}?sub=tasks`;
  return `${base}?sub=${sub}`;
}

/** Cockpit Planning : macro, Gantt, jalons (RFC-PROJ-012). */
export function projectPlanning(
  projectId: string,
  sub?: 'macro' | 'milestones' | 'gantt',
): string {
  const base = `/projects/${projectId}/planning`;
  if (!sub || sub === 'macro') return `${base}?sub=macro`;
  return `${base}?sub=${sub}`;
}

/** Scénarios projet (RFC-FE-PROJ-SC-001). */
export function projectScenarios(projectId: string): string {
  return `/projects/${projectId}/scenarios`;
}

/** Cockpit comparaison scénarios (RFC-FE-PROJ-SC-002). */
export function projectScenarioCockpit(projectId: string): string {
  return `/projects/${projectId}/scenarios/cockpit`;
}

/** Édition scénario (RFC-FE-PROJ-SC-003). */
export function projectScenarioWorkspace(projectId: string, scenarioId: string): string {
  return `/projects/${projectId}/scenarios/${scenarioId}`;
}

/** Options du projet (RFC-PROJ-OPT-001) — distinct de `projectsOptions()` (module / placeholder). */
export function projectProjectOptions(projectId: string): string {
  return `/projects/${projectId}/options`;
}

/** Registre des risques projet (RFC-PROJ-RISK-001). */
export function projectRisks(projectId: string): string {
  return `/projects/${projectId}/risks`;
}

/** Cockpit budget projet — synthèse, KPI et liaisons budgétaires. */
export function projectBudget(projectId: string): string {
  return `/projects/${projectId}/budget`;
}

/** Vue transverse — registre risques tous projets (cockpit /risks). */
export function risksRegistry(): string {
  return '/risks';
}
