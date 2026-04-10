import type {
  BudgetSummaryKpi,
  LineAmountsInput,
  BreakdownByTypeItem,
  EnvelopeLineReportItem,
} from '../types/budget-reporting.types';

const ZERO = 0;

function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Calcule les KPI agrégés à partir d'une liste de lignes (montants en number).
 * Ratios = 0 si total budgétaire = 0. Ne retourne jamais null pour les ratios.
 */
export function aggregateLinesToKpi(
  lines: LineAmountsInput[],
  currency: string | null,
  options?: { budgetCount?: number; envelopeCount?: number },
): BudgetSummaryKpi {
  const totalInitialAmount = lines.reduce((s, l) => s + l.initialAmount, ZERO);
  const totalForecastAmount = lines.reduce((s, l) => s + l.forecastAmount, ZERO);
  const totalCommittedAmount = lines.reduce(
    (s, l) => s + l.committedAmount,
    ZERO,
  );
  const totalConsumedAmount = lines.reduce((s, l) => s + l.consumedAmount, ZERO);
  const totalRemainingAmount = lines.reduce(
    (s, l) => s + l.remainingAmount,
    ZERO,
  );

  const consumptionRate = safeRate(totalConsumedAmount, totalInitialAmount);
  const commitmentRate = safeRate(totalCommittedAmount, totalInitialAmount);
  const forecastRate = safeRate(totalForecastAmount, totalInitialAmount);

  const varianceAmount = totalInitialAmount - totalConsumedAmount;
  const forecastGapAmount = totalForecastAmount - totalInitialAmount;

  let overConsumedLineCount = 0;
  let overCommittedLineCount = 0;
  let negativeRemainingLineCount = 0;
  for (const l of lines) {
    if (l.consumedAmount > l.initialAmount) overConsumedLineCount++;
    if (l.committedAmount > l.initialAmount) overCommittedLineCount++;
    if (l.remainingAmount < 0) negativeRemainingLineCount++;
  }

  return {
    totalInitialAmount,
    totalForecastAmount,
    totalCommittedAmount,
    totalConsumedAmount,
    totalRemainingAmount,
    consumptionRate,
    commitmentRate,
    forecastRate,
    varianceAmount,
    forecastGapAmount,
    ...(options?.budgetCount !== undefined && {
      budgetCount: options.budgetCount,
    }),
    ...(options?.envelopeCount !== undefined && {
      envelopeCount: options.envelopeCount,
    }),
    lineCount: lines.length,
    overConsumedLineCount,
    overCommittedLineCount,
    negativeRemainingLineCount,
    currency,
  };
}

/**
 * Calcule les ratios et indicateurs d'alerte pour une ligne.
 * initialAmount = 0 => tous les ratios = 0.
 */
export function lineToReportItem(line: {
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
}): EnvelopeLineReportItem {
  const budget = line.initialAmount;
  const consumptionRate = budget === 0 ? 0 : line.consumedAmount / budget;
  const commitmentRate = budget === 0 ? 0 : line.committedAmount / budget;
  const forecastRate = budget === 0 ? 0 : line.forecastAmount / budget;
  return {
    ...line,
    consumptionRate,
    commitmentRate,
    forecastRate,
    overConsumed: line.consumedAmount > line.initialAmount,
    overCommitted: line.committedAmount > line.initialAmount,
    negativeRemaining: line.remainingAmount < 0,
  };
}

/**
 * Groupe des lignes par type d'enveloppe et retourne les agrégats par type.
 */
export function groupLinesByEnvelopeType(
  lines: Array<LineAmountsInput & { envelopeType: string }>,
): BreakdownByTypeItem[] {
  const byType = new Map<string, LineAmountsInput[]>();
  for (const l of lines) {
    const key = l.envelopeType;
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key)!.push(l);
  }
  return Array.from(byType.entries()).map(([type, group]) => {
    const kpi = aggregateLinesToKpi(group, null);
    return {
      type,
      totalInitialAmount: kpi.totalInitialAmount,
      totalForecastAmount: kpi.totalForecastAmount,
      totalCommittedAmount: kpi.totalCommittedAmount,
      totalConsumedAmount: kpi.totalConsumedAmount,
      totalRemainingAmount: kpi.totalRemainingAmount,
      lineCount: kpi.lineCount,
    };
  });
}
