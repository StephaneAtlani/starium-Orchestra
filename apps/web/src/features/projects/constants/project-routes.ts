export function projectsList(): string {
  return '/projects';
}

/** Frise Gantt portefeuille (tous les projets filtrés). */
export function projectsPortfolioGantt(): string {
  return '/projects/portfolio-gantt';
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

/** Cockpit Planning : tâches, jalons, Gantt (RFC-PROJ-012). */
export function projectPlanning(
  projectId: string,
  sub?: 'tasks' | 'milestones' | 'gantt' | 'kanban',
): string {
  const base = `/projects/${projectId}/planning`;
  if (!sub || sub === 'tasks') return `${base}?sub=tasks`;
  return `${base}?sub=${sub}`;
}

/** Scénarios projet (RFC-FE-PROJ-SC-001). */
export function projectScenarios(projectId: string): string {
  return `/projects/${projectId}/scenarios`;
}

/** Options du projet (RFC-PROJ-OPT-001) — distinct de `projectsOptions()` (module / placeholder). */
export function projectProjectOptions(projectId: string): string {
  return `/projects/${projectId}/options`;
}

/** Registre des risques projet (RFC-PROJ-RISK-001). */
export function projectRisks(projectId: string): string {
  return `/projects/${projectId}/risks`;
}

/** Vue transverse — registre risques tous projets (cockpit /risks). */
export function risksRegistry(): string {
  return '/risks';
}
