import { describe, expect, it } from 'vitest';
import {
  formatBudgetAmount,
  formatRate,
  budgetStatusLabel,
  isBudgetRowAlert,
} from './budget-portfolio-format';
import type { BudgetListItemWithKpi } from '../types/budget-reporting.types';

describe('formatBudgetAmount', () => {
  it('formate un montant EUR sans décimales', () => {
    const s = formatBudgetAmount(123456, 'EUR');
    expect(s).toMatch(/123/);
    expect(s).toMatch(/456/);
    expect(s).toMatch(/€/);
  });
});

describe('formatRate', () => {
  it('formate un taux en pourcentage', () => {
    expect(formatRate(0.754)).toBe('75 %');
  });

  it('retourne — pour null/undefined', () => {
    expect(formatRate(null)).toBe('—');
    expect(formatRate(undefined)).toBe('—');
  });
});

describe('budgetStatusLabel', () => {
  it('retourne le libellé français', () => {
    expect(budgetStatusLabel('DRAFT')).toBe('Brouillon');
    expect(budgetStatusLabel('VALIDATED')).toBe('Validé');
  });

  it('retourne la clé brute si inconnue', () => {
    expect(budgetStatusLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});

function makeRow(overrides: Partial<BudgetListItemWithKpi['kpi']> = {}): BudgetListItemWithKpi {
  return {
    budget: { id: '1', name: 'Test', code: null, currency: 'EUR', status: 'VALIDATED' },
    kpi: {
      totalInitialAmount: 100000,
      totalForecastAmount: 90000,
      totalCommittedAmount: 50000,
      totalConsumedAmount: 40000,
      totalRemainingAmount: 10000,
      consumptionRate: 0.4,
      currency: 'EUR',
      ...overrides,
    },
  };
}

describe('isBudgetRowAlert', () => {
  it('pas d\'alerte pour un budget sain', () => {
    expect(isBudgetRowAlert(makeRow())).toBe(false);
  });

  it('alerte si forecastGapAmount > 0', () => {
    expect(isBudgetRowAlert(makeRow({ forecastGapAmount: 5000 }))).toBe(true);
  });

  it('alerte si totalRemainingAmount < 0', () => {
    expect(isBudgetRowAlert(makeRow({ totalRemainingAmount: -1 }))).toBe(true);
  });

  it('alerte si consumptionRate >= 1', () => {
    expect(isBudgetRowAlert(makeRow({ consumptionRate: 1 }))).toBe(true);
  });

  it('alerte si lignes en sur-consommation', () => {
    expect(isBudgetRowAlert(makeRow({ overConsumedLineCount: 2 }))).toBe(true);
  });
});
