import { describe, expect, it } from 'vitest';
import { buildScenarioPatchPayload, isScenarioDraftDirty } from './scenario-patch-payload';

describe('buildScenarioPatchPayload', () => {
  it('ne retourne que des clés parmi name, code, description, assumptionSummary', () => {
    const baseline = {
      name: 'Nom',
      code: 'C1',
      description: 'd',
      assumptionSummary: 'a',
    };
    const draft = {
      name: 'Nom2',
      code: 'C2',
      description: 'd2',
      assumptionSummary: 'a2',
    };
    const p = buildScenarioPatchPayload(baseline, draft);
    expect(p).not.toBeNull();
    const keys = Object.keys(p!);
    expect(keys.every((k) => ['name', 'code', 'description', 'assumptionSummary'].includes(k))).toBe(
      true,
    );
  });

  it('retourne null si aucun changement', () => {
    const baseline = {
      name: 'X',
      code: null,
      description: null,
      assumptionSummary: null,
    };
    const draft = {
      name: 'X',
      code: '',
      description: '',
      assumptionSummary: '',
    };
    expect(buildScenarioPatchPayload(baseline, draft)).toBeNull();
    expect(isScenarioDraftDirty(baseline, draft)).toBe(false);
  });
});
