import { describe, expect, it } from 'vitest';
import {
  budgetKpiAmountForTaxMode,
  formatSignedDeltaPercent,
} from './budget-formatters';
import type { BudgetSummaryKpi } from '@/features/budgets/types/budget-reporting.types';

describe('formatSignedDeltaPercent', () => {
  it('retourne null si dénominateur nul', () => {
    expect(formatSignedDeltaPercent(100, 0)).toBeNull();
  });

  it('formate (a−b)/b en % signé', () => {
    expect(formatSignedDeltaPercent(110, 100)).toMatch(/^\+/);
    expect(formatSignedDeltaPercent(90, 100)).toMatch(/^−/);
    expect(formatSignedDeltaPercent(100, 100)).not.toMatch(/^[+−]/);
  });
});

describe('budgetKpiAmountForTaxMode', () => {
  const base: BudgetSummaryKpi = {
    totalInitialAmount: 100,
    totalRevisedAmount: 200,
    totalForecastAmount: 150,
    totalCommittedAmount: 0,
    totalConsumedAmount: 0,
    totalRemainingAmount: 200,
    totalInitialAmountTtc: 120,
    totalRevisedAmountTtc: 240,
    totalForecastAmountTtc: 180,
    currency: 'EUR',
  };

  it('utilise le TTC quand le mode est TTC et les TTC sont présents', () => {
    expect(budgetKpiAmountForTaxMode(base, 'TTC', 'forecast')).toBe(180);
    expect(budgetKpiAmountForTaxMode(base, 'TTC', 'initial')).toBe(120);
  });

  it('retombe sur le HT si TTC absent', () => {
    const k: BudgetSummaryKpi = {
      ...base,
      totalForecastAmountTtc: null,
    };
    expect(budgetKpiAmountForTaxMode(k, 'TTC', 'forecast')).toBe(150);
  });
});
