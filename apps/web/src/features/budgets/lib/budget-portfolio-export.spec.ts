import { describe, expect, it } from 'vitest';
import { buildBudgetsPortfolioCsvContent } from './budget-portfolio-export';
import type { BudgetListItemWithKpi } from '../types/budget-reporting.types';

function makeRow(name: string, status: string): BudgetListItemWithKpi {
  return {
    budget: { id: 'uuid-should-not-appear', name, code: 'B01', currency: 'EUR', status },
    kpi: {
      totalInitialAmount: 100000,
      totalForecastAmount: 95000,
      totalCommittedAmount: 60000,
      totalConsumedAmount: 40000,
      totalRemainingAmount: 0,
      consumptionRate: 0.4,
      currency: 'EUR',
    },
  };
}

describe('buildBudgetsPortfolioCsvContent', () => {
  it('contient les headers attendus', () => {
    const csv = buildBudgetsPortfolioCsvContent([]);
    const headers = csv.split('\n')[0];
    expect(headers).toContain('Budget');
    expect(headers).toContain('Alloué');
    expect(headers).toContain('État');
    expect(headers).not.toContain('id');
  });

  it('utilise le libellé métier du statut, pas l\'enum', () => {
    const csv = buildBudgetsPortfolioCsvContent([makeRow('IT', 'VALIDATED')]);
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toContain('Validé');
    expect(dataLine).not.toContain('VALIDATED');
  });

  it('ne contient jamais d\'UUID budget', () => {
    const csv = buildBudgetsPortfolioCsvContent([makeRow('IT', 'DRAFT')]);
    expect(csv).not.toContain('uuid-should-not-appear');
  });

  it('formate le taux d\'exécution en %', () => {
    const csv = buildBudgetsPortfolioCsvContent([makeRow('IT', 'DRAFT')]);
    expect(csv).toContain('40 %');
  });
});
