/**
 * API budget-management — lectures (GET) et mutations create/update (RFC-FE-015).
 */

import type { ApiFormError } from './types';
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
    const apiError = await parseApiFormError(res);
    throw apiError;
  }
  return res.json() as Promise<T>;
}

/**
 * Parse une réponse non ok en ApiFormError (contrat unique formulaires).
 */
export async function parseApiFormError(res: Response): Promise<ApiFormError> {
  let message = 'Impossible d\'enregistrer les modifications.';
  let fieldErrors: Record<string, string> | undefined;
  try {
    const body = (await res.json()) as {
      message?: string | string[];
      statusCode?: number;
      errors?: Array<{ property?: string; message?: string }>;
    };
    if (Array.isArray(body.message)) {
      message = body.message[0] ?? message;
      if (body.errors?.length) {
        fieldErrors = {};
        for (const e of body.errors) {
          if (e.property) fieldErrors[e.property] = e.message ?? '';
        }
      }
    } else if (typeof body.message === 'string') {
      message = body.message;
    }
    if (res.status === 403) message = 'Vous n\'avez pas les droits nécessaires.';
    if (res.status === 404) message = 'L\'objet demandé est introuvable.';
  } catch {
    // keep default message
  }
  return { status: res.status, message, fieldErrors };
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

// ——— Mutations (RFC-FE-015) ———

export interface CreateExercisePayload {
  name: string;
  code?: string;
  startDate: string; // ISO
  endDate: string; // ISO
  status?: string;
}

export interface UpdateExercisePayload {
  name?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export async function createExercise(
  authFetch: AuthFetch,
  payload: CreateExercisePayload,
): Promise<BudgetExercise> {
  const res = await authFetch(BASE_EXERCISES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<BudgetExercise>;
}

export async function updateExercise(
  authFetch: AuthFetch,
  id: string,
  payload: UpdateExercisePayload,
): Promise<BudgetExercise> {
  const res = await authFetch(`${BASE_EXERCISES}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<BudgetExercise>;
}

export interface CreateBudgetPayload {
  exerciseId: string;
  name: string;
  code?: string;
  description?: string;
  currency: string;
  status?: string;
  ownerUserId?: string;
}

export interface UpdateBudgetPayload {
  name?: string;
  code?: string;
  description?: string;
  currency?: string;
  status?: string;
  ownerUserId?: string;
}

export async function createBudget(
  authFetch: AuthFetch,
  payload: CreateBudgetPayload,
): Promise<Budget> {
  const res = await authFetch(BASE_BUDGETS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Budget>;
}

export async function updateBudget(
  authFetch: AuthFetch,
  id: string,
  payload: UpdateBudgetPayload,
): Promise<Budget> {
  const res = await authFetch(`${BASE_BUDGETS}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Budget>;
}

export interface CreateEnvelopePayload {
  budgetId: string;
  name: string;
  code?: string;
  description?: string;
  type: string;
  parentId?: string;
  sortOrder?: number;
}

export interface UpdateEnvelopePayload {
  name?: string;
  code?: string;
  description?: string;
  type?: string;
  parentId?: string;
  sortOrder?: number;
}

export async function createEnvelope(
  authFetch: AuthFetch,
  payload: CreateEnvelopePayload,
): Promise<BudgetEnvelope> {
  const res = await authFetch(BASE_ENVELOPES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<BudgetEnvelope>;
}

export async function updateEnvelope(
  authFetch: AuthFetch,
  id: string,
  payload: UpdateEnvelopePayload,
): Promise<BudgetEnvelope> {
  const res = await authFetch(`${BASE_ENVELOPES}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<BudgetEnvelope>;
}

export interface CreateLinePayload {
  budgetId: string;
  envelopeId: string;
  name: string;
  code?: string;
  description?: string;
  expenseType: string;
  generalLedgerAccountId?: string;
  analyticalLedgerAccountId?: string | null;
  initialAmount: number;
  revisedAmount?: number;
  currency: string;
  status?: string;
}

export interface UpdateLinePayload {
  name?: string;
  code?: string;
  description?: string;
  status?: string;
  generalLedgerAccountId?: string | null;
  analyticalLedgerAccountId?: string | null;
  revisedAmount?: number;
  currency?: string;
  expenseType?: string;
}

export async function createLine(
  authFetch: AuthFetch,
  payload: CreateLinePayload,
): Promise<BudgetLine> {
  const res = await authFetch(BASE_LINES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<BudgetLine>;
}

export async function updateLine(
  authFetch: AuthFetch,
  id: string,
  payload: UpdateLinePayload,
): Promise<BudgetLine> {
  const res = await authFetch(`${BASE_LINES}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<BudgetLine>;
}
