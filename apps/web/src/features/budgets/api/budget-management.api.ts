/**
 * API budget-management — lectures (GET) et mutations create/update (RFC-FE-015).
 */

import type { ApiFormError } from './types';
import type {
  Budget,
  BudgetEnvelope,
  BudgetExercise,
  BudgetLine,
  ListBudgetDecisionHistoryQuery,
  ListBudgetDecisionHistoryResponse,
  ListBudgetEnvelopesQuery,
  ListBudgetLinesQuery,
  ListBudgetExercisesQuery,
  ListBudgetsQuery,
  PaginatedResponse,
} from '../types/budget-management.types';
import type {
  BudgetEnvelopeDetail,
  BudgetEnvelopeLineItem,
} from '../types/budget-envelope-detail.types';

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
  const defaultMessage = 'Impossible d\'enregistrer les modifications.';
  let message = defaultMessage;
  let fieldErrors: Record<string, string> | undefined;

  const text = await res.text();
  if (!text.trim()) {
    if (res.status === 403) message = 'Vous n\'avez pas les droits nécessaires.';
    else if (res.status === 404) message = 'L\'objet demandé est introuvable.';
    return { status: res.status, message, fieldErrors };
  }

  let body: {
    message?: string | string[];
    statusCode?: number;
    errors?: Array<{ property?: string; message?: string }>;
  };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 280);
    return {
      status: res.status,
      message: snippet || defaultMessage,
      fieldErrors,
    };
  }

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

/** RFC-032 — Historique décisionnel */
export async function getBudgetDecisionHistory(
  authFetch: AuthFetch,
  budgetId: string,
  query?: ListBudgetDecisionHistoryQuery,
): Promise<ListBudgetDecisionHistoryResponse> {
  const qs = new URLSearchParams();
  if (query?.envelopeId) qs.set('envelopeId', query.envelopeId);
  if (query?.budgetLineId) qs.set('budgetLineId', query.budgetLineId);
  if (query?.from) qs.set('from', query.from);
  if (query?.to) qs.set('to', query.to);
  if (query?.limit != null) qs.set('limit', String(query.limit));
  if (query?.offset != null) qs.set('offset', String(query.offset));
  if (query?.actions?.length) {
    for (const a of query.actions) {
      qs.append('actions', a);
    }
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await authFetch(`${BASE_BUDGETS}/${budgetId}/decision-history${suffix}`);
  return handleResponse<ListBudgetDecisionHistoryResponse>(res);
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

export async function getBudgetEnvelopeDetail(
  authFetch: AuthFetch,
  id: string,
): Promise<BudgetEnvelopeDetail> {
  const res = await authFetch(`${BASE_ENVELOPES}/${id}`);
  return handleResponse<BudgetEnvelopeDetail>(res);
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

export async function listEnvelopeLines(
  authFetch: AuthFetch,
  envelopeId: string,
  params?: {
    offset?: number;
    limit?: number;
    search?: string;
    status?: string;
  },
): Promise<PaginatedResponse<BudgetEnvelopeLineItem>> {
  const qs = buildQueryString({
    envelopeId,
    offset: params?.offset,
    limit: params?.limit,
    search: params?.search?.trim() || undefined,
    status: params?.status,
  });
  const res = await authFetch(`${BASE_LINES}${qs}`);
  return handleResponse<PaginatedResponse<BudgetEnvelopeLineItem>>(res);
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
  taxMode?: 'HT' | 'TTC';
  defaultTaxRate?: string;
}

export interface UpdateBudgetPayload {
  name?: string;
  code?: string;
  description?: string;
  currency?: string;
  status?: string;
  ownerUserId?: string;
  taxMode?: 'HT' | 'TTC';
  defaultTaxRate?: string;
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
  status?: string;
  /** Obligatoire si status === DEFERRED ; sinon null ou omis. */
  deferredToExerciseId?: string | null;
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
  taxRate?: number;
  currency: string;
  status?: string;
}

export interface UpdateLinePayload {
  name?: string;
  code?: string;
  description?: string;
  generalLedgerAccountId?: string | null;
  analyticalLedgerAccountId?: string | null;
  allocationScope?: 'ENTERPRISE' | 'ANALYTICAL';
  revisedAmount?: number;
  currency?: string;
  expenseType?: string;
  status?: string;
  deferredToExerciseId?: string | null;
}

export interface BulkStatusApplyResult {
  status: string;
  updatedIds: string[];
  failed: { id: string; error: string }[];
}

export async function bulkUpdateBudgetLineStatus(
  authFetch: AuthFetch,
  payload: { ids: string[]; status: string; deferredToExerciseId?: string | null },
): Promise<BulkStatusApplyResult> {
  const res = await authFetch(`${BASE_LINES}/bulk-status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<BulkStatusApplyResult>;
}

export async function bulkUpdateBudgetEnvelopeStatus(
  authFetch: AuthFetch,
  payload: { ids: string[]; status: string; deferredToExerciseId?: string | null },
): Promise<BulkStatusApplyResult> {
  const res = await authFetch(`${BASE_ENVELOPES}/bulk-status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<BulkStatusApplyResult>;
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
