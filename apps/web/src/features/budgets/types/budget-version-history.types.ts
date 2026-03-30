/**
 * Aligné sur `BudgetVersionSummary` (API budgets/:id/version-history).
 */

export type BudgetVersionKind = string;
export type BudgetVersionStatus = string;

export interface BudgetVersionSummaryDto {
  id: string;
  versionNumber: number | null;
  versionLabel: string | null;
  versionKind: BudgetVersionKind | null;
  versionStatus: BudgetVersionStatus | null;
  parentBudgetId: string | null;
  activatedAt: string | null;
  archivedAt: string | null;
  code: string;
  name: string;
  status: string;
}
