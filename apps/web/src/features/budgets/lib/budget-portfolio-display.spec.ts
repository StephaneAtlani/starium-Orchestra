import { describe, expect, it } from 'vitest';
import {
  budgetExpenseMixLabel,
  budgetExecutionTone,
  budgetPortfolioSubtitle,
} from './budget-portfolio-display';
import type { BudgetListItemWithKpi } from '../types/budget-reporting.types';

function makeRow(
  overrides: Partial<BudgetListItemWithKpi['budget']> = {},
): BudgetListItemWithKpi {
  return {
    budget: {
      id: 'b1',
      name: 'Budget IT 2026',
      code: 'IND-2026-IT',
      currency: 'EUR',
      status: 'VALIDATED',
      description: null,
      ownerOrgUnitSummary: null,
      expenseMix: null,
      ...overrides,
    },
    kpi: {
      totalInitialAmount: 100,
      totalForecastAmount: 100,
      totalCommittedAmount: 50,
      totalConsumedAmount: 40,
      totalRemainingAmount: 60,
      consumptionRate: 0.4,
      currency: 'EUR',
    },
  };
}

describe('budget-portfolio-display', () => {
  it('priorise la direction puis la description puis le code', () => {
    expect(
      budgetPortfolioSubtitle(
        makeRow({
          ownerOrgUnitSummary: {
            id: 'ou1',
            name: 'Direction des SI',
            type: 'DIRECTION',
            code: 'DSI',
          },
          description: 'Desc',
        }),
      ),
    ).toBe('Direction des SI');

    expect(budgetPortfolioSubtitle(makeRow({ description: 'Pilotage cyber' }))).toBe(
      'Pilotage cyber',
    );
    expect(budgetPortfolioSubtitle(makeRow())).toBe('IND-2026-IT');
  });

  it('mappe expenseMix vers libellé métier', () => {
    expect(budgetExpenseMixLabel('MIXTE')).toBe('Mixte');
    expect(budgetExpenseMixLabel('CAPEX')).toBe('CAPEX');
    expect(budgetExpenseMixLabel(null)).toBeNull();
  });

  it('tone exécution mockup (<75 ok, 75–89 warn, ≥90 danger)', () => {
    expect(budgetExecutionTone(0.58)).toBe('ok');
    expect(budgetExecutionTone(0.85)).toBe('warn');
    expect(budgetExecutionTone(0.94)).toBe('danger');
  });
});
