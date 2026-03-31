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

export interface ComparisonLineAmounts {
  revisedAmount: number;
  forecastAmount: number;
  consumedAmount: number;
}

export interface BudgetComparisonLineResponse {
  lineKey: string;
  lineId: string | null;
  name: string;
  varianceForecast: number;
  varianceConsumed: number;
  status: ForecastLineStatus;
  left: ComparisonLineAmounts;
  right: ComparisonLineAmounts;
}

export interface BudgetComparisonResponse {
  compareTo?: 'baseline' | 'snapshot' | 'version';
  /** Colonne dont proviennent statut / variance forecast (révisé, consommé, prévisionnel). */
  pilotageColumn?: 'left' | 'right';
  /** Libellés pour en-têtes de colonnes (montants gauche / droite). */
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
  lines: BudgetComparisonLineResponse[];
}
