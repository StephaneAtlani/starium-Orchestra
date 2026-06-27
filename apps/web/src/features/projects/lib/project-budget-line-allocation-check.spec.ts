import { describe, expect, it } from 'vitest';
import { getBudgetLineAllocationWarning } from './project-budget-line-allocation-check';

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
  });

  it('signale un dépassement du budget ligne à 100 % si arrondi supérieur', () => {
    const warning = getBudgetLineAllocationWarning(
      { ...line, initialAmount: 10_000.4, remainingAmount: 10_000.4 },
      { mode: 'PERCENTAGE', percentage: '100' },
    );
    expect(warning).not.toBeNull();
    expect(warning?.projectAllocation).toBe(10_001);
    expect(warning?.exceedsLineBudget).toBe(true);
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
    expect(warning?.exceedsLineBudget).toBe(false);
    expect(warning?.exceedsLineRemaining).toBe(true);
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
