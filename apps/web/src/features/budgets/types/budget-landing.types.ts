/**
 * Types canoniques RFC-BUD-040 — atterrissage (lecture API /api/budget-landing/*).
 * Les alias `forecast*` restent dans budget-forecast.types.ts pour la transition.
 */
export type {
  BudgetForecastResponse as BudgetLandingBudgetResponse,
  EnvelopeForecastResponse as BudgetLandingEnvelopeResponse,
  EnvelopeForecastLineItem as BudgetLandingEnvelopeLineItem,
  EnvelopeForecastLinesResponse as BudgetLandingEnvelopeLinesResponse,
  ForecastLineStatus as BudgetLandingLineStatus,
} from './budget-forecast.types';
