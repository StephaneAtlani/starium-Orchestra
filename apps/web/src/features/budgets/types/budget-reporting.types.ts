/**
 * Types alignés sur les réponses API budget-reporting (summary, listes, KPI).
 */

export interface BudgetSummaryKpi {
  totalInitialAmount: number;
  totalRevisedAmount: number;
  totalForecastAmount: number;
  totalCommittedAmount: number;
  totalConsumedAmount: number;
  totalRemainingAmount: number;
  totalInitialAmountTtc?: number | null;
  totalRevisedAmountTtc?: number | null;
  totalForecastAmountTtc?: number | null;
  totalCommittedAmountTtc?: number | null;
  totalConsumedAmountTtc?: number | null;
  totalRemainingAmountTtc?: number | null;
  /** Ratios 0–1 (agrégat API). */
  consumptionRate?: number;
  commitmentRate?: number;
  forecastRate?: number;
  forecastGapAmount?: number;
  lineCount?: number;
  overConsumedLineCount?: number;
  overCommittedLineCount?: number;
  negativeRemainingLineCount?: number;
  currency: string | null;
}

export interface ExerciseSummaryResponse {
  exerciseId: string;
  budget: { id: string; name: string; code: string | null; currency: string } | null;
  kpi: BudgetSummaryKpi;
}

export interface BudgetSummaryResponse {
  budgetId: string;
  budget: { id: string; name: string; code: string | null; currency: string; status: string };
  kpi: BudgetSummaryKpi;
}

export interface BudgetListItemWithKpi {
  budget: {
    id: string;
    name: string;
    code: string | null;
    currency: string;
    status: string;
  };
  kpi: BudgetSummaryKpi;
}

export interface EnvelopeListItemWithKpi {
  envelope: {
    id: string;
    name: string;
    code: string | null;
    type: string;
  };
  kpi: BudgetSummaryKpi;
}

export interface LineListItemWithRates {
  line: unknown;
  consumptionRate?: number;
  commitmentRate?: number;
  forecastRate?: number;
  overConsumed?: boolean;
  overCommitted?: boolean;
  negativeRemaining?: boolean;
}

export interface PaginatedReportingResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListBudgetsForExerciseQuery {
  offset?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface ListEnvelopesForBudgetQuery {
  offset?: number;
  limit?: number;
  type?: string;
  parentId?: string;
  includeChildren?: boolean;
}

export interface ListLinesForEnvelopeQuery {
  offset?: number;
  limit?: number;
  search?: string;
  status?: string;
}
