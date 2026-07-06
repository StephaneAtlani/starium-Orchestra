import { describe, expect, it } from 'vitest';
import {
  getBudgetLineAllocationWarning,
  isBlockingLineAllocationWarning,
} from './project-budget-line-allocation-check';

const line = {
  code: 'L-01',
  name: 'Infrastructure',
  initialAmount: 10_001,
  remainingAmount: 5_000,
};

describe('getBudgetLineAllocationWarning — PERCENTAGE', () => {
  it('arrondit le montant imputé à l’entier supérieur avant comparaison', () => {
    const warning = getBudgetLineAllocationWarning(line, {
      mode: 'PERCENTAGE',
      percentage: '50',
    });
    expect(warning).not.toBeNull();
    expect(warning?.projectAllocation).toBe(5_001);
    expect(warning?.exceedsLineRemaining).toBe(true);
    expect(warning?.exceedsLineBudget).toBe(false);
    expect(warning?.kind).toBe('line_remaining');
  });

  it('signale un dépassement du budget ligne à 100 % si arrondi supérieur', () => {
    const warning = getBudgetLineAllocationWarning(
      { ...line, initialAmount: 10_000.4, remainingAmount: 10_000.4 },
      { mode: 'PERCENTAGE', percentage: '100' },
    );
    expect(warning).not.toBeNull();
    expect(warning?.projectAllocation).toBe(10_001);
    expect(warning?.exceedsLineBudget).toBe(true);
    expect(warning?.kind).toBe('line_budget');
    expect(isBlockingLineAllocationWarning(warning!)).toBe(true);
  });

  it('ne signale rien si le montant arrondi tient dans le budget et le disponible', () => {
    const warning = getBudgetLineAllocationWarning(
      { ...line, initialAmount: 10_000, remainingAmount: 6_000 },
      { mode: 'PERCENTAGE', percentage: '50' },
    );
    expect(warning).toBeNull();
  });
});

describe('getBudgetLineAllocationWarning — BUDGET_PERCENTAGE', () => {
  it('calcule le montant à partir du budget total (arrondi supérieur)', () => {
    const warning = getBudgetLineAllocationWarning(line, {
      mode: 'BUDGET_PERCENTAGE',
      percentage: '50',
      budgetTotalInitialAmount: 10_002,
    });
    expect(warning).not.toBeNull();
    expect(warning?.projectAllocation).toBe(5_001);
    expect(warning?.kind).toBe('line_remaining');
    expect(warning?.exceedsLineBudget).toBe(false);
  });

  it('100 % du budget total → dépassement imputé, pas erreur bloquante', () => {
    const warning = getBudgetLineAllocationWarning(
      { ...line, initialAmount: 50_000, remainingAmount: 40_000 },
      {
        mode: 'BUDGET_PERCENTAGE',
        percentage: '100',
        budgetTotalInitialAmount: 500_000,
      },
    );
    expect(warning).not.toBeNull();
    expect(warning?.kind).toBe('budget_percentage_overrun');
    expect(warning?.projectAllocation).toBe(500_000);
    expect(warning?.lineOverrun).toBe(450_000);
    expect(warning?.severity).toBe('info');
    expect(isBlockingLineAllocationWarning(warning!)).toBe(false);
  });

  it('ne signale rien si l’enveloppe tient dans le budget ligne', () => {
    const warning = getBudgetLineAllocationWarning(
      { ...line, initialAmount: 600_000, remainingAmount: 600_000 },
      {
        mode: 'BUDGET_PERCENTAGE',
        percentage: '100',
        budgetTotalInitialAmount: 500_000,
      },
    );
    expect(warning).toBeNull();
  });
});

describe('getBudgetLineAllocationWarning — FIXED', () => {
  it('compare le montant saisi sans arrondi', () => {
    const warning = getBudgetLineAllocationWarning(line, {
      mode: 'FIXED',
      amount: '5001',
    });
    expect(warning).not.toBeNull();
    expect(warning?.projectAllocation).toBe(5_001);
    expect(warning?.exceedsLineRemaining).toBe(true);
  });
});
