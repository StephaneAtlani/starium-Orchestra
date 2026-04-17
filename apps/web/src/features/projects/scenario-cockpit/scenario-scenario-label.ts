import type { ProjectScenarioApi } from '../types/project.types';

/** Libellé cockpit — jamais d’id seul. */
export function scenarioDisplayLabel(s: ProjectScenarioApi): string {
  const code = s.code?.trim();
  const name = s.name.trim();
  if (code) return `${name} (${code})`;
  return name;
}
