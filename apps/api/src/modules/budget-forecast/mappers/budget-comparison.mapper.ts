import {
  computeLineStatus,
  computeVarianceConsumed,
  computeVarianceForecast,
  safeRate,
} from '../calculators/variance.calculator';
import type {
  BudgetComparisonLineResponse,
  BudgetComparisonResponse,
  ComparisonLineAmounts,
  ForecastLineStatus,
} from '../types/budget-forecast.types';

type SideName = 'left' | 'right';

type ComparedPair = {
  lineKey: string;
  name: string;
  left: ComparisonLineAmounts;
  right: ComparisonLineAmounts;
  liveLineId: string | null;
};

function zeroAmounts(): ComparisonLineAmounts {
  return { revisedAmount: 0, forecastAmount: 0, consumedAmount: 0 };
}

function getLineComputedValues(params: {
  left: ComparisonLineAmounts;
  right: ComparisonLineAmounts;
  liveSide: SideName | null;
}): {
  varianceForecast: number;
  varianceConsumed: number;
  status: ForecastLineStatus;
} {
  const source =
    params.liveSide === 'left'
      ? params.left
      : params.liveSide === 'right'
        ? params.right
        : params.right;

  return {
    varianceForecast: computeVarianceForecast(
      source.revisedAmount,
      source.forecastAmount,
    ),
    varianceConsumed: computeVarianceConsumed(
      source.revisedAmount,
      source.consumedAmount,
    ),
    status: computeLineStatus({
      budget: source.revisedAmount,
      consumed: source.consumedAmount,
      forecast: source.forecastAmount,
    }),
  };
}

export function mapComparedPairsToLines(params: {
  pairs: ComparedPair[];
  liveSide: SideName | null;
}): BudgetComparisonLineResponse[] {
  return params.pairs.map((pair) => {
    const computed = getLineComputedValues({
      left: pair.left,
      right: pair.right,
      liveSide: params.liveSide,
    });
    return {
      lineKey: pair.lineKey,
      lineId: params.liveSide ? pair.liveLineId : null,
      name: pair.name,
      varianceForecast: computed.varianceForecast,
      varianceConsumed: computed.varianceConsumed,
      status: computed.status,
      left: pair.left,
      right: pair.right,
    };
  });
}

export function buildBudgetComparisonResponse(params: {
  compareTo?: 'baseline' | 'snapshot' | 'version';
  leftLabel?: string;
  rightLabel?: string;
  left?: { kind: string; budgetId?: string; snapshotId?: string };
  right?: { kind: string; budgetId?: string; snapshotId?: string };
  leftSnapshotId?: string;
  rightSnapshotId?: string;
  budgetId?: string;
  currency: string | null;
  pairs: ComparedPair[];
  liveSide: SideName | null;
}): BudgetComparisonResponse {
  const lines = mapComparedPairsToLines({
    pairs: params.pairs,
    liveSide: params.liveSide,
  });

  const totalRightBudget = params.pairs.reduce(
    (sum, p) => sum + p.right.revisedAmount,
    0,
  );
  const totalRightForecast = params.pairs.reduce(
    (sum, p) => sum + p.right.forecastAmount,
    0,
  );
  const totalRightConsumed = params.pairs.reduce(
    (sum, p) => sum + p.right.consumedAmount,
    0,
  );

  const totalLeftBudget = params.pairs.reduce(
    (sum, p) => sum + p.left.revisedAmount,
    0,
  );
  const totalLeftForecast = params.pairs.reduce(
    (sum, p) => sum + p.left.forecastAmount,
    0,
  );
  const totalLeftConsumed = params.pairs.reduce(
    (sum, p) => sum + p.left.consumedAmount,
    0,
  );

  const varianceBudget = computeVarianceForecast(
    totalRightBudget,
    totalRightForecast,
  );
  const varianceConsumed = computeVarianceConsumed(
    totalRightBudget,
    totalRightConsumed,
  );

  return {
    compareTo: params.compareTo,
    leftLabel: params.leftLabel,
    rightLabel: params.rightLabel,
    left: params.left,
    right: params.right,
    leftSnapshotId: params.leftSnapshotId,
    rightSnapshotId: params.rightSnapshotId,
    budgetId: params.budgetId,
    currency: params.currency,
    totals: {
      budget: totalRightBudget,
      forecast: totalRightForecast,
      consumed: totalRightConsumed,
    },
    variance: {
      forecast: varianceBudget,
      consumed: varianceConsumed,
    },
    diff: {
      revisedAmount: totalRightBudget - totalLeftBudget,
      forecastAmount: totalRightForecast - totalLeftForecast,
      consumedAmount: totalRightConsumed - totalLeftConsumed,
    },
    lines,
  };
}

export function toPair(params: {
  lineKey: string;
  name: string;
  left: ComparisonLineAmounts | null;
  right: ComparisonLineAmounts | null;
  liveLineId: string | null;
}): ComparedPair {
  return {
    lineKey: params.lineKey,
    name: params.name,
    left: params.left ?? zeroAmounts(),
    right: params.right ?? zeroAmounts(),
    liveLineId: params.liveLineId,
  };
}

export function lineRates(amounts: ComparisonLineAmounts): {
  consumptionRate: number;
  forecastRate: number;
} {
  return {
    consumptionRate: safeRate(amounts.consumedAmount, amounts.revisedAmount),
    forecastRate: safeRate(amounts.forecastAmount, amounts.revisedAmount),
  };
}
