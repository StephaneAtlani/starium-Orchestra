import { BudgetLineStatus } from '@prisma/client';
import {
  BUDGET_LINE_PILOTAGE_INCLUDED_STATUSES,
  isBudgetLineIncludedInPilotageTotals,
} from './budget-aggregate-statuses';

describe('budget-aggregate-statuses (pilotage)', () => {
  it('inclut ACTIVE, PENDING_VALIDATION, CLOSED', () => {
    expect(isBudgetLineIncludedInPilotageTotals(BudgetLineStatus.ACTIVE)).toBe(true);
    expect(isBudgetLineIncludedInPilotageTotals(BudgetLineStatus.PENDING_VALIDATION)).toBe(
      true,
    );
    expect(isBudgetLineIncludedInPilotageTotals(BudgetLineStatus.CLOSED)).toBe(true);
  });

  it('exclut DRAFT, REJECTED, DEFERRED, ARCHIVED', () => {
    expect(isBudgetLineIncludedInPilotageTotals(BudgetLineStatus.DRAFT)).toBe(false);
    expect(isBudgetLineIncludedInPilotageTotals(BudgetLineStatus.REJECTED)).toBe(false);
    expect(isBudgetLineIncludedInPilotageTotals(BudgetLineStatus.DEFERRED)).toBe(false);
    expect(isBudgetLineIncludedInPilotageTotals(BudgetLineStatus.ARCHIVED)).toBe(false);
  });

  it('taille du set inclus = 3', () => {
    expect(BUDGET_LINE_PILOTAGE_INCLUDED_STATUSES.size).toBe(3);
  });
});
