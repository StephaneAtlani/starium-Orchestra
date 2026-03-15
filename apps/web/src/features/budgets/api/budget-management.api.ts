/**
 * API budget-management — lectures uniquement (GET).
 * Mutations (create/update) : non implémentées dans cette RFC.
 */

import type {
  Budget,
  BudgetEnvelope,
  BudgetExercise,
  BudgetLine,
  ListBudgetEnvelopesQuery,
  ListBudgetExercisesQuery,
  ListBudgetLinesQuery,
  ListBudgetsQuery,
  PaginatedResponse,
} from '../types/budget-management.types';

export type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

const BASE_EXERCISES = '/api/budget-exercises';
const BASE_BUDGETS = '/api/budgets';
const BASE_ENVELOPES = '/api/budget-envelopes';
const BASE_LINES = '/api/budget-lines';

function buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.set(k, String(v));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 404) throw new Error('Ressource non trouvée');
    throw new Error(`Erreur API: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ——— Exercices ———
export async function listExercises(
  authFetch: AuthFetch,
  query?: ListBudgetExercisesQuery,
): Promise<PaginatedResponse<BudgetExercise>> {
  const qs = buildQueryString(query as Record<string, string | number | boolean | undefined>);
  const res = await authFetch(`${BASE_EXERCISES}${qs}`);
  return handleResponse<PaginatedResponse<BudgetExercise>>(res);
}

export async function getExercise(authFetch: AuthFetch, id: string): Promise<BudgetExercise> {
  const res = await authFetch(`${BASE_EXERCISES}/${id}`);
  return handleResponse<BudgetExercise>(res);
}

// ——— Budgets ———
export async function listBudgets(
  authFetch: AuthFetch,
  query?: ListBudgetsQuery,
): Promise<PaginatedResponse<Budget>> {
  const qs = buildQueryString(query as Record<string, string | number | boolean | undefined>);
  const res = await authFetch(`${BASE_BUDGETS}${qs}`);
  return handleResponse<PaginatedResponse<Budget>>(res);
}

export async function getBudget(authFetch: AuthFetch, id: string): Promise<Budget> {
  const res = await authFetch(`${BASE_BUDGETS}/${id}`);
  return handleResponse<Budget>(res);
}

// ——— Enveloppes ———
export async function listEnvelopes(
  authFetch: AuthFetch,
  query: ListBudgetEnvelopesQuery,
): Promise<PaginatedResponse<BudgetEnvelope>> {
  const qs = buildQueryString({
    budgetId: query.budgetId,
    search: query.search,
    offset: query.offset,
    limit: query.limit,
  });
  const res = await authFetch(`${BASE_ENVELOPES}${qs}`);
  return handleResponse<PaginatedResponse<BudgetEnvelope>>(res);
}

export async function getEnvelope(authFetch: AuthFetch, id: string): Promise<BudgetEnvelope> {
  const res = await authFetch(`${BASE_ENVELOPES}/${id}`);
  return handleResponse<BudgetEnvelope>(res);
}

// ——— Lignes ———
export async function listLines(
  authFetch: AuthFetch,
  query?: ListBudgetLinesQuery,
): Promise<PaginatedResponse<BudgetLine>> {
  const qs = buildQueryString(query as Record<string, string | number | boolean | undefined>);
  const res = await authFetch(`${BASE_LINES}${qs}`);
  return handleResponse<PaginatedResponse<BudgetLine>>(res);
}

export async function getLine(authFetch: AuthFetch, id: string): Promise<BudgetLine> {
  const res = await authFetch(`${BASE_LINES}/${id}`);
  return handleResponse<BudgetLine>(res);
}
