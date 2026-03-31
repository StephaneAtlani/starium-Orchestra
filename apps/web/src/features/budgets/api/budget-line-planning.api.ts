import type { ApiFormError } from './types';
import type {
  ApplyAnnualSpreadPayload,
  ApplyBudgetLinePlanningModePayload,
  ApplyCalculationPlanningPayload,
  ApplyGrowthPlanningPayload,
  ApplyOneShotPlanningPayload,
  ApplyQuarterlyPlanningPayload,
  BudgetLinePlanningResponse,
  CalculatePlanningPayload,
  CalculatePlanningPreviewResponse,
} from '../types/budget-line-planning.types';
import type { AuthFetch } from './budget-management.api';

const BASE_PLANNING = '/api/budget-lines';

async function handleJsonOrFormError<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const apiError = await parseApiFormError(res);
    throw apiError;
  }
  return res.json() as Promise<T>;
}

// On réutilise le parser d'erreur de budget-management.api pour garder un format homogène.
// Import circulaire à éviter, donc on redéfinit la signature et on laisse l'implémentation réelle dans budget-management.api.
// Le bundler fusionnera correctement si utilisé depuis les hooks.
async function parseApiFormError(res: Response): Promise<ApiFormError> {
  const mod = await import('./budget-management.api');
  return mod.parseApiFormError(res);
}

export async function getBudgetLinePlanning(
  authFetch: AuthFetch,
  lineId: string,
): Promise<BudgetLinePlanningResponse> {
  const res = await authFetch(`${BASE_PLANNING}/${lineId}/planning`);
  return handleJsonOrFormError<BudgetLinePlanningResponse>(res);
}

export interface UpdateBudgetLinePlanningManualPayload {
  months: { monthIndex: number; amount: number }[];
}

export async function updateBudgetLinePlanningManual(
  authFetch: AuthFetch,
  lineId: string,
  payload: UpdateBudgetLinePlanningManualPayload,
): Promise<BudgetLinePlanningResponse> {
  const res = await authFetch(`${BASE_PLANNING}/${lineId}/planning`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJsonOrFormError<BudgetLinePlanningResponse>(res);
}

/** RFC-023 : route unifiée (les routes apply-* restent utilisables). */
export async function applyBudgetLinePlanningMode(
  authFetch: AuthFetch,
  lineId: string,
  payload: ApplyBudgetLinePlanningModePayload,
): Promise<BudgetLinePlanningResponse> {
  const res = await authFetch(`${BASE_PLANNING}/${lineId}/planning/apply-mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJsonOrFormError<BudgetLinePlanningResponse>(res);
}

export async function applyBudgetLineAnnualSpread(
  authFetch: AuthFetch,
  lineId: string,
  payload: ApplyAnnualSpreadPayload,
): Promise<BudgetLinePlanningResponse> {
  const res = await authFetch(`${BASE_PLANNING}/${lineId}/planning/apply-annual-spread`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJsonOrFormError<BudgetLinePlanningResponse>(res);
}

export async function applyBudgetLineQuarterly(
  authFetch: AuthFetch,
  lineId: string,
  payload: ApplyQuarterlyPlanningPayload,
): Promise<BudgetLinePlanningResponse> {
  const res = await authFetch(`${BASE_PLANNING}/${lineId}/planning/apply-quarterly`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJsonOrFormError<BudgetLinePlanningResponse>(res);
}

export async function applyBudgetLineOneShot(
  authFetch: AuthFetch,
  lineId: string,
  payload: ApplyOneShotPlanningPayload,
): Promise<BudgetLinePlanningResponse> {
  const res = await authFetch(`${BASE_PLANNING}/${lineId}/planning/apply-one-shot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJsonOrFormError<BudgetLinePlanningResponse>(res);
}

export async function applyBudgetLineGrowth(
  authFetch: AuthFetch,
  lineId: string,
  payload: ApplyGrowthPlanningPayload,
): Promise<BudgetLinePlanningResponse> {
  const res = await authFetch(`${BASE_PLANNING}/${lineId}/planning/apply-growth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJsonOrFormError<BudgetLinePlanningResponse>(res);
}

export async function calculateBudgetLinePlanning(
  authFetch: AuthFetch,
  lineId: string,
  payload: CalculatePlanningPayload,
): Promise<CalculatePlanningPreviewResponse> {
  const res = await authFetch(`${BASE_PLANNING}/${lineId}/planning/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJsonOrFormError<CalculatePlanningPreviewResponse>(res);
}

export async function applyBudgetLineCalculation(
  authFetch: AuthFetch,
  lineId: string,
  payload: ApplyCalculationPlanningPayload,
): Promise<BudgetLinePlanningResponse> {
  const res = await authFetch(`${BASE_PLANNING}/${lineId}/planning/apply-calculation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJsonOrFormError<BudgetLinePlanningResponse>(res);
}

