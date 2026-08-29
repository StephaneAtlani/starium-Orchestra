import { BudgetLineStatus, BudgetStatus } from '@prisma/client';

/** Liste figée — utiliser aussi pour `Prisma` `status: { in: [...] }`. */
export const PILOTAGE_INCLUDED_LINE_STATUSES: readonly BudgetLineStatus[] = [
  BudgetLineStatus.ACTIVE,
  BudgetLineStatus.PENDING_VALIDATION,
  BudgetLineStatus.CLOSED,
];

/**
 * RFC-BUD-041 C6 — totaux officiels d’une fiche budget VALIDATED / LOCKED / ARCHIVED :
 * PENDING hors KPI. Construction DRAFT/SUBMITTED/REVISED : inchangé.
 */
export const OFFICIAL_COCKPIT_LINE_STATUSES: readonly BudgetLineStatus[] = [
  BudgetLineStatus.ACTIVE,
  BudgetLineStatus.CLOSED,
];

export function pilotageLineStatusesForBudgetStatus(
  budgetStatus: BudgetStatus,
): readonly BudgetLineStatus[] {
  if (
    budgetStatus === BudgetStatus.VALIDATED ||
    budgetStatus === BudgetStatus.LOCKED ||
    budgetStatus === BudgetStatus.ARCHIVED
  ) {
    return OFFICIAL_COCKPIT_LINE_STATUSES;
  }
  return PILOTAGE_INCLUDED_LINE_STATUSES;
}

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

export function isBudgetLineIncludedInOfficialCockpitTotals(
  lineStatus: BudgetLineStatus,
  budgetStatus: BudgetStatus,
): boolean {
  return pilotageLineStatusesForBudgetStatus(budgetStatus).includes(lineStatus);
}
