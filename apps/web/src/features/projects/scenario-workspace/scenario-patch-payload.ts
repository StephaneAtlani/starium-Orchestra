import type { ProjectScenarioApi, UpdateProjectScenarioPayload } from '../types/project.types';

export type ScenarioOverviewDraft = {
  name: string;
  code: string;
  description: string;
  assumptionSummary: string;
};

function normalizeCode(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

function normalizeText(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

/** Payload PATCH : uniquement les clés modifiées parmi `name` | `code` | `description` | `assumptionSummary`. */
export function buildScenarioPatchPayload(
  baseline: Pick<ProjectScenarioApi, 'name' | 'code' | 'description' | 'assumptionSummary'>,
  draft: ScenarioOverviewDraft,
): UpdateProjectScenarioPayload | null {
  const payload: UpdateProjectScenarioPayload = {};
  const name = draft.name.trim();
  if (name !== baseline.name) payload.name = name;
  const code = normalizeCode(draft.code);
  if (code !== baseline.code) payload.code = code;
  const desc = normalizeText(draft.description);
  if (desc !== (baseline.description ?? null)) payload.description = desc;
  const asm = normalizeText(draft.assumptionSummary);
  if (asm !== (baseline.assumptionSummary ?? null)) payload.assumptionSummary = asm;
  return Object.keys(payload).length === 0 ? null : payload;
}

export function isScenarioDraftDirty(
  baseline: Pick<ProjectScenarioApi, 'name' | 'code' | 'description' | 'assumptionSummary'>,
  draft: ScenarioOverviewDraft,
): boolean {
  return buildScenarioPatchPayload(baseline, draft) !== null;
}

export function scenarioToDraft(
  scenario: Pick<ProjectScenarioApi, 'name' | 'code' | 'description' | 'assumptionSummary'>,
): ScenarioOverviewDraft {
  return {
    name: scenario.name,
    code: scenario.code ?? '',
    description: scenario.description ?? '',
    assumptionSummary: scenario.assumptionSummary ?? '',
  };
}
