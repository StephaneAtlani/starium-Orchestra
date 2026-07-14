import { describe, expect, it } from 'vitest';
import {
  agendaRowsMatchPreset,
  getAgendaPresetForReviewType,
  isPilotageReviewType,
  REVIEW_TYPE_AGENDA_HINT,
} from './project-review-agenda-presets';

describe('project-review-agenda-presets', () => {
  it('expose un modèle non vide pour chaque type de pilotage', () => {
    for (const type of [
      'COPIL',
      'COPRO',
      'CODIR_REVIEW',
      'RISK_REVIEW',
      'MILESTONE_REVIEW',
      'AD_HOC',
    ] as const) {
      expect(isPilotageReviewType(type)).toBe(true);
      const preset = getAgendaPresetForReviewType(type);
      expect(preset.length).toBeGreaterThan(0);
      expect(preset.every((row) => row.title.trim().length > 0)).toBe(true);
      expect(REVIEW_TYPE_AGENDA_HINT[type]).toMatch(/\S/);
    }
  });

  it('ne propose pas de modèle ODJ pour le retour d’expérience', () => {
    expect(isPilotageReviewType('POST_MORTEM')).toBe(false);
    expect(getAgendaPresetForReviewType('POST_MORTEM')).toEqual([]);
  });

  it('COPIL inclut budget, risques et suivi actions', () => {
    const types = getAgendaPresetForReviewType('COPIL').map((r) => r.itemType);
    expect(types).toContain('BUDGET');
    expect(types).toContain('RISK');
    expect(types).toContain('ACTION_REVIEW');
  });

  it('RISK_REVIEW oriente vers le registre et la mitigation', () => {
    const preset = getAgendaPresetForReviewType('RISK_REVIEW');
    const joined = preset.map((row) => `${row.title} ${row.description}`).join(' ');
    expect(joined).toMatch(/registre des risques/i);
    expect(joined).toMatch(/mitigation/i);
    expect(preset.filter((row) => row.itemType === 'RISK')).toHaveLength(2);
  });

  it('agendaRowsMatchPreset détecte une divergence', () => {
    const preset = getAgendaPresetForReviewType('AD_HOC');
    expect(agendaRowsMatchPreset(preset, preset)).toBe(true);
    expect(
      agendaRowsMatchPreset(
        [{ ...preset[0], title: 'Autre titre' }, ...preset.slice(1)],
        preset,
      ),
    ).toBe(false);
  });
});
