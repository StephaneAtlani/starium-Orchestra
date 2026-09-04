/**
 * Agrège des lignes budgétaires en KPI de synthèse (filtre CAPEX/OPEX côté fiche).
 * Les montants viennent des lignes déjà chargées via l’API — pas d’invention de données.
 */

import type { BudgetLine } from '@/features/budgets/types/budget-management.types';
import type { BudgetSummaryKpi } from '@/features/budgets/types/budget-reporting.types';

type LineAmounts = Pick<
  BudgetLine,
  | 'initialAmount'
  | 'forecastAmount'
  | 'landingAmount'
  | 'committedAmount'
  | 'consumedAmount'
  | 'remainingAmount'
  | 'initialAmountTtc'
  | 'forecastAmountTtc'
  | 'committedAmountTtc'
  | 'consumedAmountTtc'
  | 'remainingAmountTtc'
>;

function landingHt(line: LineAmounts): number {
  return line.landingAmount ?? line.forecastAmount;
}

function sumTtc(
  lines: readonly LineAmounts[],
  pick: (line: LineAmounts) => number | null | undefined,
): number | null {
  let total = 0;
  let any = false;
  for (const line of lines) {
    const value = pick(line);
    if (value != null && Number.isFinite(value)) {
      total += value;
      any = true;
    }
  }
  return any ? total : null;
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/** KPI synthétiques pour une sélection de lignes (ex. nature CAPEX ou OPEX). */
export function aggregateBudgetLinesToSummaryKpi(
  lines: readonly LineAmounts[],
  currency: string | null,
): BudgetSummaryKpi {
  const totalInitialAmount = lines.reduce((s, l) => s + l.initialAmount, 0);
  const totalLandingAmount = lines.reduce((s, l) => s + landingHt(l), 0);
  const totalCommittedAmount = lines.reduce((s, l) => s + l.committedAmount, 0);
  const totalConsumedAmount = lines.reduce((s, l) => s + l.consumedAmount, 0);
  const totalRemainingAmount = lines.reduce((s, l) => s + l.remainingAmount, 0);
  const landingGapAmount = totalLandingAmount - totalInitialAmount;

  let overConsumedLineCount = 0;
  let overCommittedLineCount = 0;
  let negativeRemainingLineCount = 0;
  for (const line of lines) {
    if (line.consumedAmount > line.initialAmount) overConsumedLineCount += 1;
    if (line.committedAmount > line.initialAmount) overCommittedLineCount += 1;
    if (line.remainingAmount < 0) negativeRemainingLineCount += 1;
  }

  return {
    totalInitialAmount,
    totalForecastAmount: totalLandingAmount,
    totalLandingAmount,
    totalCommittedAmount,
    totalConsumedAmount,
    totalRemainingAmount,
    totalInitialAmountTtc: sumTtc(lines, (l) => l.initialAmountTtc),
    totalForecastAmountTtc: sumTtc(lines, (l) => l.forecastAmountTtc),
    totalLandingAmountTtc: sumTtc(lines, (l) => l.forecastAmountTtc),
    totalCommittedAmountTtc: sumTtc(lines, (l) => l.committedAmountTtc),
    totalConsumedAmountTtc: sumTtc(lines, (l) => l.consumedAmountTtc),
    totalRemainingAmountTtc: sumTtc(lines, (l) => l.remainingAmountTtc),
    consumptionRate: safeRate(totalConsumedAmount, totalInitialAmount),
    commitmentRate: safeRate(totalCommittedAmount, totalInitialAmount),
    forecastRate: safeRate(totalLandingAmount, totalInitialAmount),
    landingRate: safeRate(totalLandingAmount, totalInitialAmount),
    forecastGapAmount: landingGapAmount,
    landingGapAmount,
    lineCount: lines.length,
    overConsumedLineCount,
    overCommittedLineCount,
    negativeRemainingLineCount,
    currency,
  };
}
