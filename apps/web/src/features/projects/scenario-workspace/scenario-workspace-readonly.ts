import type { ProjectScenarioApi } from '../types/project.types';

/** Scénario archivé : UI lecture seule, aucune mutation (RFC-FE-PROJ-SC-003 §3). */
export function isScenarioWorkspaceReadOnly(
  scenario: Pick<ProjectScenarioApi, 'status'>,
): boolean {
  return scenario.status === 'ARCHIVED';
}
