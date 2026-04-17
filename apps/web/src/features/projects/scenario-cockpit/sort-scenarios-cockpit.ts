import type { ProjectScenarioApi } from '../types/project.types';

/**
 * Tri canonique RFC-FE-PROJ-SC-002 : une seule implémentation.
 * — Exclut ARCHIVED
 * — createdAt DESC si présent sur les entrées, sinon name ASC
 */
export function sortScenariosForCockpit(scenarios: ProjectScenarioApi[]): ProjectScenarioApi[] {
  const filtered = scenarios.filter((s) => s.status !== 'ARCHIVED');
  const sample = filtered[0];
  const useCreatedAt =
    sample !== undefined &&
    typeof sample === 'object' &&
    'createdAt' in sample &&
    typeof (sample as { createdAt?: unknown }).createdAt === 'string';

  const sorted = [...filtered];
  if (useCreatedAt) {
    sorted.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }
  return sorted;
}

/** Premier scénario du tri canonique ≠ baseline, ou null. */
export function resolveDefaultComparedId(
  sortedNonArchived: ProjectScenarioApi[],
  baselineId: string,
): string | null {
  const next = sortedNonArchived.find((s) => s.id !== baselineId);
  return next?.id ?? null;
}
