import { describe, expect, it } from 'vitest';
import {
  BUDGET_LABELS,
  BUDGET_LABEL_HINTS,
  formatBudgetSelectLabel,
  isHumanBudgetCode,
} from './budget-display-labels';

describe('BUDGET_LABELS', () => {
  it('expose un libellé unique par concept financier (RFC-BUD-040)', () => {
    expect(BUDGET_LABELS.budget).toBe('Budget');
    expect(BUDGET_LABELS.planningTab).toBe('Prévisionnel');
    expect(BUDGET_LABELS.planningTotal).toBe('Total prévisionnel');
    expect(BUDGET_LABELS.remainingPlanning).toBe('Prévision restante');
    expect(BUDGET_LABELS.landing).toBe('Atterrissage');
    expect(BUDGET_LABELS.landingGap).toBe("Écart d'atterrissage");
    expect(BUDGET_LABELS.committed).toBe('Engagé');
    expect(BUDGET_LABELS.consumed).toBe('Consommé');
    expect(BUDGET_LABELS.remaining).toBe('Restant');
    expect(BUDGET_LABELS.snapshot).toBe('Version figée');
  });

  it('mappe les alias dépréciés vers atterrissage', () => {
    expect(BUDGET_LABELS.forecast).toBe('Atterrissage');
    expect(BUDGET_LABELS.forecastGap).toBe("Écart d'atterrissage");
  });

  it('n\'utilise aucun synonyme interdit', () => {
    const values = Object.values(BUDGET_LABELS);
    expect(values).not.toContain('Total planifié');
    expect(values).not.toContain('Forecast');
    expect(BUDGET_LABELS.forecast).toBe(BUDGET_LABELS.landing);
    expect(BUDGET_LABELS.forecastGap).toBe(BUDGET_LABELS.landingGap);
  });
});

describe('BUDGET_LABEL_HINTS', () => {
  it('documente l\'atterrissage sans ambiguïté', () => {
    expect(BUDGET_LABEL_HINTS.landing).toContain('consommé');
    expect(BUDGET_LABEL_HINTS.landing).toContain('engagé');
  });
});

describe('isHumanBudgetCode', () => {
  it('accepte les codes métier lisibles', () => {
    expect(isHumanBudgetCode('BUD-2025')).toBe(true);
    expect(isHumanBudgetCode('SI-RUN-V3')).toBe(true);
    expect(isHumanBudgetCode('ACME-2026-INFRA-V1')).toBe(true);
  });

  it('rejette les codes embarquant un fragment technique', () => {
    expect(isHumanBudgetCode('budget-si-g51wje5a-V3')).toBe(false);
    expect(isHumanBudgetCode('cm3x9v2k7000108l4h1a2b3c')).toBe(false);
  });

  it('rejette les codes vides ou absents', () => {
    expect(isHumanBudgetCode(null)).toBe(false);
    expect(isHumanBudgetCode(undefined)).toBe(false);
    expect(isHumanBudgetCode('   ')).toBe(false);
  });
});

describe('formatBudgetSelectLabel', () => {
  it('ajoute le code quand il est lisible', () => {
    expect(formatBudgetSelectLabel('Budget SI', 'BUD-2025')).toBe('Budget SI (BUD-2025)');
  });

  it('masque un code contenant un fragment CUID', () => {
    expect(formatBudgetSelectLabel('Budget SI', 'budget-si-g51wje5a-V3')).toBe('Budget SI');
  });

  it('retombe sur le nom seul sans code', () => {
    expect(formatBudgetSelectLabel('Budget SI', null)).toBe('Budget SI');
  });
});
