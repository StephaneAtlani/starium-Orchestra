/** Modes pour GET /budget-comparisons/budgets/:id (référence unique). */
export type BudgetComparisonMode = 'baseline' | 'snapshot';
export type ForecastLineStatus = 'OK' | 'WARNING' | 'CRITICAL';

export interface BudgetForecastResponse {
  budgetId: string;
  currency: string | null;
  totalBudget: number;
  totalConsumed: number;
  totalForecast: number;
  totalRemaining: number;
  varianceConsumed: number;
  varianceForecast: number;
  consumptionRate: number;
  forecastRate: number;
  alerts: {
    overForecast: number;
    overConsumed: number;
  };
}

export interface EnvelopeForecastResponse {
  envelopeId: string;
  currency: string | null;
  totalBudget: number;
  totalConsumed: number;
  totalForecast: number;
  totalRemaining: number;
  varianceConsumed: number;
  varianceForecast: number;
  consumptionRate: number;
  forecastRate: number;
  alerts: {
    overForecast: number;
    overConsumed: number;
  };
}

export interface EnvelopeForecastLineItem {
  lineId: string;
  code: string;
  name: string;
  budget: number;
  consumed: number;
  forecast: number;
  remaining: number;
  varianceConsumed: number;
  varianceForecast: number;
  consumptionRate: number;
  forecastRate: number;
  status: ForecastLineStatus;
}

export interface EnvelopeForecastLinesResponse {
  envelopeId: string;
  currency: string | null;
  lines: EnvelopeForecastLineItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface BudgetComparisonLineAmounts {
  budgetAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
}

export interface BudgetComparisonLineItem {
  lineKey: string;
  lineId: string | null;
  name: string;
  varianceForecast: number;
  varianceConsumed: number;
  status: ForecastLineStatus;
  left: BudgetComparisonLineAmounts;
  right: BudgetComparisonLineAmounts;
}

export interface BudgetComparisonResponse {
  /** Inclut `version` pour réponses issues d’autres endpoints (ex. paire de versions). */
  compareTo?: BudgetComparisonMode | 'version';
  /** Colonne source statut / variance (API). Défaut UI : live vs ref. → gauche ; paires sans live → droite. */
  pilotageColumn?: 'left' | 'right';
  /** Libellés pour les colonnes de montants (réponse API). */
  leftLabel?: string;
  rightLabel?: string;
  left?: { kind: string; budgetId?: string; snapshotId?: string };
  right?: { kind: string; budgetId?: string; snapshotId?: string };
  leftSnapshotId?: string;
  rightSnapshotId?: string;
  budgetId?: string;
  currency: string | null;
  totals: {
    budget: number;
    forecast: number;
    committed: number;
    consumed: number;
  };
  variance: {
    forecast: number;
    consumed: number;
  };
  diff: {
    budgetAmount: number;
    forecastAmount: number;
    committedAmount: number;
    consumedAmount: number;
  };
  lines: BudgetComparisonLineItem[];
}
