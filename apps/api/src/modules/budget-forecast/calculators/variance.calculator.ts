import type {
  ComparisonLineAmounts,
  ForecastLineStatus,
} from '../types/budget-forecast.types';

export function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

export function computeLineStatus(params: {
  budget: number;
  consumed: number;
  forecast: number;
}): ForecastLineStatus {
  if (params.consumed > params.budget) return 'CRITICAL';
  if (params.consumed <= params.budget && params.forecast > params.budget) {
    return 'WARNING';
  }
  return 'OK';
}

export function computeVarianceConsumed(
  budget: number,
  consumed: number,
): number {
  return budget - consumed;
}

export function computeVarianceForecast(
  budget: number,
  forecast: number,
): number {
  return budget - forecast;
}

export function normalizeLineCode(code: string): string {
  return code.trim().toUpperCase();
}

export function toLineAmounts(input: {
  revisedAmount: number;
  forecastAmount: number;
  consumedAmount: number;
}): ComparisonLineAmounts {
  return {
    revisedAmount: input.revisedAmount,
    forecastAmount: input.forecastAmount,
    consumedAmount: input.consumedAmount,
  };
}
