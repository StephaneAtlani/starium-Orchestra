export interface BudgetEnvelopeDetailResponseDto {
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
  deferredToExerciseId: string | null;
  deferredToExerciseName: string | null;
  deferredToExerciseCode: string | null;
}

