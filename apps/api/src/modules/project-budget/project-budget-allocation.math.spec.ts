import {
  computePercentageLineAllocationAmount,
  computeProjectBudgetAllocation,
} from './project-budget-allocation.math';

describe('project-budget-allocation.math', () => {
  describe('computePercentageLineAllocationAmount', () => {
    it('ceil 10% de 1000 → 100', () => {
      expect(computePercentageLineAllocationAmount(1000, 10)).toBe(100);
    });

    it('ceil 33% de 100 → 33', () => {
      expect(computePercentageLineAllocationAmount(100, 33)).toBe(33);
    });

    it('base ou % ≤ 0 → null', () => {
      expect(computePercentageLineAllocationAmount(0, 10)).toBeNull();
      expect(computePercentageLineAllocationAmount(100, 0)).toBeNull();
    });
  });

  describe('computeProjectBudgetAllocation', () => {
    const base = {
      percentage: null as number | null,
      amount: null as number | null,
      lineInitial: 10_000,
      budgetTotalInitial: 100_000,
      lineCommitted: 4_000,
      lineConsumed: 2_000,
    };

    it('FULL : share 1, allocated = lineInitial', () => {
      const r = computeProjectBudgetAllocation({
        ...base,
        allocationType: 'FULL',
      });
      expect(r.share).toBe(1);
      expect(r.projectAllocatedAmount).toBe(10_000);
      expect(r.imputedCommitted).toBe(4_000);
      expect(r.imputedConsumed).toBe(2_000);
    });

    it('PERCENTAGE 25 %', () => {
      const r = computeProjectBudgetAllocation({
        ...base,
        allocationType: 'PERCENTAGE',
        percentage: 25,
      });
      expect(r.share).toBe(0.25);
      expect(r.projectAllocatedAmount).toBe(2_500);
      expect(r.imputedCommitted).toBe(1_000);
      expect(r.imputedConsumed).toBe(500);
    });

    it('BUDGET_PERCENTAGE 5 % du budget total', () => {
      const r = computeProjectBudgetAllocation({
        ...base,
        allocationType: 'BUDGET_PERCENTAGE',
        percentage: 5,
      });
      // 5% de 100_000 = 5000 ; share vs ligne = 0.5
      expect(r.projectAllocatedAmount).toBe(5_000);
      expect(r.share).toBe(0.5);
      expect(r.imputedCommitted).toBe(2_000);
      expect(r.imputedConsumed).toBe(1_000);
    });

    it('FIXED : min(amount, line*)', () => {
      const r = computeProjectBudgetAllocation({
        ...base,
        allocationType: 'FIXED',
        amount: 1_500,
      });
      expect(r.share).toBe(0);
      expect(r.projectAllocatedAmount).toBe(1_500);
      expect(r.imputedCommitted).toBe(1_500);
      expect(r.imputedConsumed).toBe(1_500);
    });

    it('FIXED amount > lineConsumed → plafonné', () => {
      const r = computeProjectBudgetAllocation({
        ...base,
        allocationType: 'FIXED',
        amount: 50_000,
        lineConsumed: 2_000,
        lineCommitted: 4_000,
      });
      expect(r.imputedConsumed).toBe(2_000);
      expect(r.imputedCommitted).toBe(4_000);
    });

    it('PERCENTAGE sans lineInitial → allocated null, share ok', () => {
      const r = computeProjectBudgetAllocation({
        ...base,
        allocationType: 'PERCENTAGE',
        percentage: 50,
        lineInitial: null,
      });
      expect(r.share).toBe(0.5);
      expect(r.projectAllocatedAmount).toBeNull();
      expect(r.imputedConsumed).toBe(1_000);
    });

    it('FIXED amount ≤ 0 → allocated null', () => {
      const r = computeProjectBudgetAllocation({
        ...base,
        allocationType: 'FIXED',
        amount: 0,
      });
      expect(r.projectAllocatedAmount).toBeNull();
      expect(r.imputedConsumed).toBeNull();
    });
  });
});
