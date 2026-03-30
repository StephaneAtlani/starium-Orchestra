export type BudgetComparisonMode = 'baseline' | 'snapshot' | 'version';
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
  revisedAmount: number;
  forecastAmount: number;
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
  compareTo?: BudgetComparisonMode;
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
    consumed: number;
  };
  variance: {
    forecast: number;
    consumed: number;
  };
  diff: {
    revisedAmount: number;
    forecastAmount: number;
    consumedAmount: number;
  };
  lines: BudgetComparisonLineItem[];
}
