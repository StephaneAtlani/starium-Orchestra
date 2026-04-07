export interface BudgetEnvelopeDetail {
  id: string;
  budgetId: string;
  budgetName: string;
  code: string | null;
  name: string;
  description: string | null;
  status: string;
  currency: string;
  initialAmount: number;
  revisedAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  deferredToExerciseId?: string | null;
  deferredToExerciseName?: string | null;
  deferredToExerciseCode?: string | null;
}

export interface BudgetEnvelopeLineItem {
  id: string;
  code: string | null;
  name: string;
  status: string;
  initialAmount: number;
  revisedAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  currency: string;
}

