import { describe, expect, it } from 'vitest';
import {
  budgetKpiAmountForTaxMode,
  formatCurrency,
  formatSignedDeltaPercent,
} from './budget-formatters';
import type { BudgetSummaryKpi } from '@/features/budgets/types/budget-reporting.types';

describe('formatCurrency (RFC-FE-BUD-030)', () => {
  it('formate avec 2 décimales et devise', () => {
    const s = formatCurrency(1234.5, 'EUR');
    expect(s).toMatch(/1/);
    expect(s).toMatch(/34/);
    expect(s).toMatch(/50/);
    expect(s).toMatch(/€/);
  });

  it('utilise EUR si currency null', () => {
    const s = formatCurrency(100, null);
    expect(s).toMatch(/€/);
  });
});

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
    totalInitialAmount: 200,
    totalForecastAmount: 150,
    totalLandingAmount: 160,
    totalCommittedAmount: 0,
    totalConsumedAmount: 0,
    totalRemainingAmount: 200,
    totalInitialAmountTtc: 240,
    totalForecastAmountTtc: 180,
    totalLandingAmountTtc: 192,
    currency: 'EUR',
  };

  it('utilise le TTC landing quand le mode est TTC', () => {
    expect(budgetKpiAmountForTaxMode(base, 'TTC', 'landing')).toBe(192);
    expect(budgetKpiAmountForTaxMode(base, 'TTC', 'forecast')).toBe(180);
    expect(budgetKpiAmountForTaxMode(base, 'TTC', 'initial')).toBe(240);
  });

  it('retombe sur forecast si landing TTC absent', () => {
    const k: BudgetSummaryKpi = {
      ...base,
      totalLandingAmountTtc: null,
    };
    expect(budgetKpiAmountForTaxMode(k, 'TTC', 'landing')).toBe(180);
  });

  it('utilise le TTC quand le mode est TTC et les TTC sont présents', () => {
    expect(budgetKpiAmountForTaxMode(base, 'TTC', 'forecast')).toBe(180);
    expect(budgetKpiAmountForTaxMode(base, 'TTC', 'initial')).toBe(240);
  });

  it('retombe sur le HT si TTC absent', () => {
    const k: BudgetSummaryKpi = {
      ...base,
      totalForecastAmountTtc: null,
      totalLandingAmountTtc: null,
    };
    expect(budgetKpiAmountForTaxMode(k, 'TTC', 'forecast')).toBe(150);
    expect(budgetKpiAmountForTaxMode(k, 'TTC', 'landing')).toBe(160);
  });
});
