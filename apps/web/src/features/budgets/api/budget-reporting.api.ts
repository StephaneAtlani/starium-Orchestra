/**
 * API budget-reporting — lectures (GET).
 * Ne pas implémenter getBreakdownByType, getTotalsByCostCenter, getTotalsByGeneralLedgerAccount
 * sauf si la page dashboard ou un écran de base en a réellement besoin pour FE-001.
 */

import type {
  BudgetListItemWithKpi,
  BudgetSummaryKpi,
  EnvelopeListItemWithKpi,
  ExerciseSummaryResponse,
  LineListItemWithRates,
  ListBudgetsForExerciseQuery,
  ListEnvelopesForBudgetQuery,
  ListLinesForEnvelopeQuery,
  PaginatedReportingResponse,
} from '../types/budget-reporting.types';

export type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

const BASE = '/api/budget-reporting';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 404) throw new Error('Ressource non trouvée');
    if (res.status === 400) throw new Error('Requête invalide (ex. multi-devise)');
    throw new Error(`Erreur API: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.set(k, String(v));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function getExerciseSummary(
  authFetch: AuthFetch,
  exerciseId: string,
): Promise<ExerciseSummaryResponse> {
  const res = await authFetch(`${BASE}/exercises/${exerciseId}/summary`);
  return handleResponse<ExerciseSummaryResponse>(res);
}

export async function listBudgetsForExercise(
  authFetch: AuthFetch,
  exerciseId: string,
  query?: ListBudgetsForExerciseQuery,
): Promise<PaginatedReportingResponse<BudgetListItemWithKpi>> {
  const qs = buildQueryString(query as Record<string, string | number | boolean | undefined>);
  const res = await authFetch(`${BASE}/exercises/${exerciseId}/budgets${qs}`);
  return handleResponse<PaginatedReportingResponse<BudgetListItemWithKpi>>(res);
}

/** GET renvoie directement les KPI agrégés (pas d’enveloppe `{ kpi }` — aligné Nest `BudgetReportingService.getBudgetSummary`). */
export async function getBudgetSummary(
  authFetch: AuthFetch,
  budgetId: string,
): Promise<BudgetSummaryKpi> {
  const res = await authFetch(`${BASE}/budgets/${budgetId}/summary`);
  return handleResponse<BudgetSummaryKpi>(res);
}

export async function listEnvelopesForBudget(
  authFetch: AuthFetch,
  budgetId: string,
  query?: ListEnvelopesForBudgetQuery,
): Promise<PaginatedReportingResponse<EnvelopeListItemWithKpi>> {
  const qs = buildQueryString(query as Record<string, string | number | boolean | undefined>);
  const res = await authFetch(`${BASE}/budgets/${budgetId}/envelopes${qs}`);
  return handleResponse<PaginatedReportingResponse<EnvelopeListItemWithKpi>>(res);
}

export async function getEnvelopeSummary(
  authFetch: AuthFetch,
  envelopeId: string,
  params?: { includeChildren?: boolean },
): Promise<{ envelopeId: string; kpi: unknown }> {
  const qs = buildQueryString(params as Record<string, string | number | boolean | undefined>);
  const res = await authFetch(`${BASE}/envelopes/${envelopeId}/summary${qs}`);
  return handleResponse(res);
}

export async function listLinesForEnvelope(
  authFetch: AuthFetch,
  envelopeId: string,
  query?: ListLinesForEnvelopeQuery,
): Promise<PaginatedReportingResponse<LineListItemWithRates>> {
  const qs = buildQueryString(query as Record<string, string | number | boolean | undefined>);
  const res = await authFetch(`${BASE}/envelopes/${envelopeId}/lines${qs}`);
  return handleResponse<PaginatedReportingResponse<LineListItemWithRates>>(res);
}
