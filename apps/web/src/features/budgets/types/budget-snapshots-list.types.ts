/**
 * Aligné sur `ListSnapshotsResult` / `BudgetSnapshotSummary` (API budget-snapshots).
 */

export type BudgetSnapshotStatus = string;

export interface BudgetSnapshotSummaryDto {
  id: string;
  budgetId: string;
  exerciseId?: string;
  name: string;
  code: string;
  description: string | null;
  snapshotDate: string;
  status: BudgetSnapshotStatus;
  budgetName: string;
  budgetCode: string | null;
  budgetCurrency: string;
  budgetStatus: string;
  totalInitialAmount: number;
  totalRevisedAmount: number;
  totalForecastAmount: number;
  totalCommittedAmount: number;
  totalConsumedAmount: number;
  totalRemainingAmount: number;
  createdByUserId: string | null;
  createdAt: string;
}

export interface ListBudgetSnapshotsResult {
  items: BudgetSnapshotSummaryDto[];
  total: number;
  limit: number;
  offset: number;
}
