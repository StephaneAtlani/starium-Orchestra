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
  createdByLabel: string | null;
  createdAt: string;
  occasionTypeId?: string | null;
  occasionTypeCode?: string | null;
  occasionTypeLabel?: string | null;
  occasionTypeScope?: 'global' | 'client' | null;
}

export interface ListBudgetSnapshotsResult {
  items: BudgetSnapshotSummaryDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface BudgetSnapshotLineDto {
  id: string;
  budgetLineId: string;
  envelopeName: string | null;
  lineCode: string;
  lineName: string;
  expenseType: string;
  currency: string;
  initialAmount: number;
  revisedAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
}

export interface BudgetSnapshotDetailDto extends BudgetSnapshotSummaryDto {
  totals: {
    initialAmount: number;
    revisedAmount: number;
    forecastAmount: number;
    committedAmount: number;
    consumedAmount: number;
    remainingAmount: number;
  };
  lines: BudgetSnapshotLineDto[];
}

export interface CreateBudgetSnapshotInput {
  budgetId: string;
  label?: string;
  name?: string;
  description?: string;
  /** ISO 8601 date (jour ou date-heure) — optionnel, défaut côté serveur = maintenant */
  snapshotDate?: string;
  /** Type d’occasion (référentiel RFC-033) — optionnel */
  occasionTypeId?: string | null;
}
