import { describe, expect, it } from 'vitest';
import { buildScenarioMetaLabel, canArchiveScenario } from './ScenarioCard';

describe('canArchiveScenario', () => {
  it('désactive l’archivage pour un scénario SELECTED', () => {
    expect(canArchiveScenario({ status: 'SELECTED', isBaseline: true })).toBe(false);
  });

  it('désactive l’archivage pour un scénario ARCHIVED', () => {
    expect(canArchiveScenario({ status: 'ARCHIVED', isBaseline: false })).toBe(false);
  });

  it('autorise l’archivage pour un scénario DRAFT non baseline', () => {
    expect(canArchiveScenario({ status: 'DRAFT', isBaseline: false })).toBe(true);
  });

  it('n’expose pas d’ID brut dans le libellé de méta', () => {
    const label = buildScenarioMetaLabel({ code: 'SCN-01', version: 3 });
    expect(label).toContain('SCN-01');
    expect(label).toContain('Version 3');
    expect(label).not.toContain('id');
  });
});
