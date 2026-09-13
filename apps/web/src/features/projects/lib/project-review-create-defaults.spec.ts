import { describe, expect, it } from 'vitest';
import {
  agendaModelLabelForType,
  autoCreateTitleForTypeAndDate,
  defaultCreateTitleForType,
  objectivePlaceholderForType,
  titlePlaceholderForType,
} from './project-review-create-defaults';

describe('project-review-create-defaults (CDC P1)', () => {
  it('placeholders titre / objectif adaptés au type', () => {
    expect(titlePlaceholderForType('COPRO')).toMatch(/COPROJ/);
    expect(objectivePlaceholderForType('COPRO')).toMatch(/suivi hebdomadaire/i);
    expect(titlePlaceholderForType('OTHER')).toMatch(/Ad hoc/);
  });

  it('titre prérempli COPROJ avec n° de semaine', () => {
    const title = defaultCreateTitleForType(
      'COPRO',
      new Date('2026-05-25T10:00:00'),
    );
    expect(title).toBe('COPROJ — Semaine 22');
  });

  it('titre auto suit la date saisie', () => {
    expect(autoCreateTitleForTypeAndDate('COPRO', '2026-09-14')).toBe(
      'COPROJ — Semaine 38',
    );
    expect(autoCreateTitleForTypeAndDate('COPIL', '2026-04-10')).toMatch(
      /^COPIL — Avril 2026$/i,
    );
  });

  it('libellé modèle ODJ CDC', () => {
    expect(agendaModelLabelForType('COPRO', 5)).toBe(
      'Modèle COPROJ standard (5 points)',
    );
    expect(agendaModelLabelForType('COPIL', 1)).toBe(
      'Modèle COPIL standard (1 point)',
    );
  });
});
