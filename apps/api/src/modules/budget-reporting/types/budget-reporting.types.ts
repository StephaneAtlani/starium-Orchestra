/**
 * KPI budgétaire agrégé (summary exercice, budget ou enveloppe).
 * `totalInitialAmount` = somme des montants budgétaires des lignes (HT stocké).
 * currency: string | null (null si périmètre sans ligne pour exercice/enveloppe selon règles).
 */
export interface BudgetSummaryKpi {
  totalInitialAmount: number;
  totalForecastAmount: number;
  totalCommittedAmount: number;
  totalConsumedAmount: number;
  totalRemainingAmount: number;
  // Projections TTC (montants budgétés) pour affichage uniquement.
  // Si au moins une ligne ne permet pas d'établir un taux effectif, alors ces valeurs sont à `null`.
  totalInitialAmountTtc?: number | null;
  totalForecastAmountTtc?: number | null;
  totalCommittedAmountTtc?: number | null;
  totalConsumedAmountTtc?: number | null;
  totalRemainingAmountTtc?: number | null;
  consumptionRate: number;
  commitmentRate: number;
  forecastRate: number;
  varianceAmount: number;
  forecastGapAmount: number;
  budgetCount?: number;
  envelopeCount?: number;
  lineCount: number;
  overConsumedLineCount: number;
  overCommittedLineCount: number;
  negativeRemainingLineCount: number;
  currency: string | null;
}

/**
 * Ligne budgétaire avec montants en number (pour réponses API).
 */
export interface BudgetLineAmounts {
  initialAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
}

/**
 * Entrée pour le mapper KPI (montants en number).
 */
export interface LineAmountsInput {
  initialAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
}

/**
 * Ligne de reporting avec ratios et indicateurs d'alerte.
 */
export interface EnvelopeLineReportItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  expenseType: string;
  status: string;
  currency: string;
  initialAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  consumptionRate: number;
  commitmentRate: number;
  forecastRate: number;
  overConsumed: boolean;
  overCommitted: boolean;
  negativeRemaining: boolean;
}

/**
 * Répartition par type d'enveloppe (RUN / BUILD / TRANSVERSE).
 */
export interface BreakdownByTypeItem {
  type: string;
  totalInitialAmount: number;
  totalForecastAmount: number;
  totalCommittedAmount: number;
  totalConsumedAmount: number;
  totalRemainingAmount: number;
  lineCount: number;
}

export interface ListResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
