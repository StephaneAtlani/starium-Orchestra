import { Prisma } from '@prisma/client';
import { computeRemainingPlanningAmount } from '@starium-orchestra/budget-exercise-calendar';
import type { LandingInput, LandingResult } from './budget-landing.types';

function toDecimal(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value as Prisma.Decimal.Value);
}

function planningMonthsToAmounts12(
  planningMonths: LandingInput['planningMonths'],
): number[] {
  const amounts = Array.from({ length: 12 }, () => 0);
  for (const month of planningMonths) {
    if (month.monthIndex < 1 || month.monthIndex > 12) continue;
    amounts[month.monthIndex - 1] = toDecimal(month.amount).toNumber();
  }
  return amounts;
}

/** Formule pure RFC-BUD-040 §3.1 */
export function calculateLanding(input: LandingInput): LandingResult {
  const effectiveBudgetBase = toDecimal(input.effectiveBudgetBase);
  const consumedAmount = toDecimal(input.consumedAmount);
  const committedAmount = toDecimal(input.committedAmount);
  const amounts12 = planningMonthsToAmounts12(input.planningMonths ?? []);

  const planningTotalAmount = amounts12.reduce(
    (sum, amount) => sum.plus(amount),
    new Prisma.Decimal(0),
  );

  const remainingPlanning = new Prisma.Decimal(
    computeRemainingPlanningAmount(
      input.exerciseStart,
      input.exerciseEnd,
      input.referenceDate,
      amounts12,
    ),
  );

  const landingAmount = consumedAmount
    .plus(committedAmount)
    .plus(remainingPlanning);

  const landingVariance = landingAmount.minus(effectiveBudgetBase);
  const planningDelta = planningTotalAmount.minus(effectiveBudgetBase);

  return {
    planningTotalAmount: planningTotalAmount.toDecimalPlaces(2),
    remainingPlanning: remainingPlanning.toDecimalPlaces(2),
    landingAmount: landingAmount.toDecimalPlaces(2),
    landingVariance: landingVariance.toDecimalPlaces(2),
    planningDelta: planningDelta.toDecimalPlaces(2),
  };
}

export function landingRate(
  landingAmount: Prisma.Decimal | number,
  effectiveBudgetBase: Prisma.Decimal | number,
): number {
  const base = toDecimal(effectiveBudgetBase).toNumber();
  if (base <= 0) return 0;
  return toDecimal(landingAmount).toNumber() / base;
}

export function computeLandingLineStatus(params: {
  effectiveBudgetBase: number;
  consumed: number;
  landing: number;
}): 'OK' | 'WARNING' | 'CRITICAL' {
  if (params.consumed > params.effectiveBudgetBase) return 'CRITICAL';
  if (params.consumed <= params.effectiveBudgetBase && params.landing > params.effectiveBudgetBase) {
    return 'WARNING';
  }
  return 'OK';
}
