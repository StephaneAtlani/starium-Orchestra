import { describe, expect, it } from 'vitest';
import {
  BUDGET_LABELS,
  formatBudgetSelectLabel,
  isHumanBudgetCode,
} from './budget-display-labels';

describe('BUDGET_LABELS', () => {
  it('expose un libellé unique par concept financier', () => {
    expect(BUDGET_LABELS.budget).toBe('Budget');
    expect(BUDGET_LABELS.forecast).toBe('Prévision');
    expect(BUDGET_LABELS.committed).toBe('Engagé');
    expect(BUDGET_LABELS.consumed).toBe('Consommé');
    expect(BUDGET_LABELS.remaining).toBe('Restant');
    expect(BUDGET_LABELS.forecastGap).toBe('Écart prévision');
    expect(BUDGET_LABELS.snapshot).toBe('Version figée');
  });

  it('n\'utilise aucun synonyme interdit', () => {
    const values = Object.values(BUDGET_LABELS);
    expect(values).not.toContain('Total planifié');
    expect(values).not.toContain('Forecast');
    expect(new Set(values).size).toBe(values.length);
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
