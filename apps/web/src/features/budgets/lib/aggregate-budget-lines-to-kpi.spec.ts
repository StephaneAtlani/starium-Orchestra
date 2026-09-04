import { describe, expect, it } from 'vitest';
import { aggregateBudgetLinesToSummaryKpi } from './aggregate-budget-lines-to-kpi';

describe('aggregateBudgetLinesToSummaryKpi', () => {
  it('agrège HT + TTC et calcule l’écart d’atterrissage', () => {
    const kpi = aggregateBudgetLinesToSummaryKpi(
      [
        {
          initialAmount: 100,
          forecastAmount: 120,
          landingAmount: 120,
          committedAmount: 40,
          consumedAmount: 30,
          remainingAmount: 70,
          initialAmountTtc: 120,
          forecastAmountTtc: 144,
          committedAmountTtc: 48,
          consumedAmountTtc: 36,
          remainingAmountTtc: 84,
        },
        {
          initialAmount: 50,
          forecastAmount: 40,
          landingAmount: null,
          committedAmount: 10,
          consumedAmount: 60,
          remainingAmount: -10,
          initialAmountTtc: 60,
          forecastAmountTtc: 48,
          committedAmountTtc: 12,
          consumedAmountTtc: 72,
          remainingAmountTtc: -12,
        },
      ],
      'EUR',
    );

    expect(kpi.totalInitialAmount).toBe(150);
    expect(kpi.totalLandingAmount).toBe(160);
    expect(kpi.totalForecastAmount).toBe(160);
    expect(kpi.totalCommittedAmount).toBe(50);
    expect(kpi.totalConsumedAmount).toBe(90);
    expect(kpi.totalRemainingAmount).toBe(60);
    expect(kpi.landingGapAmount).toBe(10);
    expect(kpi.lineCount).toBe(2);
    expect(kpi.overConsumedLineCount).toBe(1);
    expect(kpi.negativeRemainingLineCount).toBe(1);
    expect(kpi.totalInitialAmountTtc).toBe(180);
    expect(kpi.totalConsumedAmountTtc).toBe(108);
    expect(kpi.currency).toBe('EUR');
  });

  it('retourne des zéros si aucune ligne', () => {
    const kpi = aggregateBudgetLinesToSummaryKpi([], 'EUR');
    expect(kpi.totalInitialAmount).toBe(0);
    expect(kpi.lineCount).toBe(0);
    expect(kpi.totalInitialAmountTtc).toBeNull();
  });
});
