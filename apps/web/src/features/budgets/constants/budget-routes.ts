/**
 * Constantes de routes du module Budget — liens et navigation.
 */

export const BUDGETS_ROOT = '/budgets';

export function budgetExercisesList(): string {
  return `${BUDGETS_ROOT}/exercises`;
}

export function budgetExerciseDetail(id: string): string {
  return `${BUDGETS_ROOT}/exercises/${id}`;
}

export function budgetDetail(budgetId: string): string {
  return `${BUDGETS_ROOT}/${budgetId}`;
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
