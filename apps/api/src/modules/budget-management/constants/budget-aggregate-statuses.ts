import { BudgetLineStatus } from '@prisma/client';

/** Liste figée — utiliser aussi pour `Prisma` `status: { in: [...] }`. */
export const PILOTAGE_INCLUDED_LINE_STATUSES: readonly BudgetLineStatus[] = [
  BudgetLineStatus.ACTIVE,
  BudgetLineStatus.PENDING_VALIDATION,
  BudgetLineStatus.CLOSED,
];

/**
 * Source de vérité : lignes incluses dans les totaux de pilotage (reporting, dashboard, réalloc).
 * @see plan flux statuts budget
 */
export const BUDGET_LINE_PILOTAGE_INCLUDED_STATUSES: ReadonlySet<BudgetLineStatus> =
  new Set(PILOTAGE_INCLUDED_LINE_STATUSES);

export const BUDGET_LINE_PILOTAGE_EXCLUDED_STATUSES: ReadonlySet<BudgetLineStatus> =
  new Set([
    BudgetLineStatus.DRAFT,
    BudgetLineStatus.REJECTED,
    BudgetLineStatus.DEFERRED,
    BudgetLineStatus.ARCHIVED,
  ]);

export function isBudgetLineIncludedInPilotageTotals(
  status: BudgetLineStatus,
): boolean {
  return BUDGET_LINE_PILOTAGE_INCLUDED_STATUSES.has(status);
}
