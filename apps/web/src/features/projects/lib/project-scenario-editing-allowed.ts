import type { ProjectListItem } from '../types/project.types';

/** Édition des scénarios réservée au projet en statut brouillon. */
export function isProjectScenarioEditingAllowed(
  project: Pick<ProjectListItem, 'status'>,
): boolean {
  return project.status === 'DRAFT';
}
