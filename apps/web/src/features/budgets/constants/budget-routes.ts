/**
 * Constantes de routes du module Budget — liens et navigation.
 */

export const BUDGETS_ROOT = '/budgets';

export function budgetList(): string {
  return BUDGETS_ROOT;
}

export function budgetListWithExercise(exerciseId: string): string {
  return `${BUDGETS_ROOT}?exerciseId=${encodeURIComponent(exerciseId)}`;
}

export function budgetExercisesList(): string {
  return `${BUDGETS_ROOT}/exercises`;
}

export function budgetExerciseNew(): string {
  return `${BUDGETS_ROOT}/exercises/new`;
}

export function budgetExerciseEdit(id: string): string {
  return `${BUDGETS_ROOT}/exercises/${id}/edit`;
}

export function budgetExerciseDetail(id: string): string {
  return `${BUDGETS_ROOT}/exercises/${id}`;
}

export function budgetDetail(budgetId: string): string {
  return `${BUDGETS_ROOT}/${budgetId}`;
}

export function budgetNew(): string {
  return `${BUDGETS_ROOT}/new`;
}

export function budgetEdit(budgetId: string): string {
  return `${BUDGETS_ROOT}/${budgetId}/edit`;
}

export function budgetEnvelopeNew(budgetId: string): string {
  return `${BUDGETS_ROOT}/${budgetId}/envelopes/new`;
}

export function budgetEnvelopeEdit(envelopeId: string): string {
  return `/budget-envelopes/${envelopeId}/edit`;
}

export function budgetLineNew(budgetId: string): string {
  return `${BUDGETS_ROOT}/${budgetId}/lines/new`;
}

export function budgetLineEdit(lineId: string): string {
  return `/budget-lines/${lineId}/edit`;
}

export function budgetLines(budgetId: string): string {
  return `${BUDGETS_ROOT}/${budgetId}/lines`;
}

export function budgetReporting(budgetId: string): string {
  return `${BUDGETS_ROOT}/${budgetId}/reporting`;
}

export function budgetSnapshots(budgetId: string): string {
  return `${BUDGETS_ROOT}/${budgetId}/snapshots`;
}

export function budgetVersions(budgetId: string): string {
  return `${BUDGETS_ROOT}/${budgetId}/versions`;
}

export function budgetReallocations(budgetId: string): string {
  return `${BUDGETS_ROOT}/${budgetId}/reallocations`;
}

export function budgetImports(): string {
  return `${BUDGETS_ROOT}/imports`;
}

export function budgetDashboard(): string {
  return `${BUDGETS_ROOT}/dashboard`;
}
