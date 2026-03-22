/**
 * API financial-core côté budget line (RFC-FE-ADD-006).
 * Frontend only — endpoints existants :
 * - GET /api/budget-lines/:id/events
 * - GET /api/budget-lines/:id/allocations
 * - POST /api/financial-events
 */

import type { AuthFetch } from './budget-management.api';
import { parseApiFormError } from './budget-management.api';
import type { PaginatedResponse } from '../types/budget-management.types';

export interface FinancialEventForLine {
  id: string;
  eventType: string;
  // Legacy: montant HT historique (synchro avec amountHt côté backend)
  amount: number;
  amountHt: number;
  taxRate: number | null;
  taxAmount: number | null;
  amountTtc: number | null;
  currency: string;
  eventDate: string;
  label: string;
  description?: string | null;
  sourceType: string;
  sourceId?: string | null;
}

export interface FinancialAllocationForLine {
  id: string;
  allocationType: string;
  allocatedAmount: number;
  currency: string;
  effectiveDate: string;
  sourceType: string;
  sourceId?: string | null;
  notes?: string | null;
}

export interface CreateFinancialEventPayload {
  budgetLineId: string;
  sourceType: 'MANUAL' | string;
  eventType: string;
  amountHt?: string;
  amountTtc?: string;
  taxRate?: string;
  taxAmount?: string;
  useDefaultTaxRate?: boolean;
  currency: string;
  eventDate: string; // ISO
  label: string;
  description?: string;
}

const BASE_BUDGET_LINES = '/api/budget-lines';
const BASE_FINANCIAL_EVENTS = '/api/financial-events';

function buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function listBudgetLineEvents(
  authFetch: AuthFetch,
  budgetLineId: string,
  params?: { offset?: number; limit?: number },
): Promise<PaginatedResponse<FinancialEventForLine>> {
  const qs = buildQueryString({
    offset: params?.offset,
    limit: params?.limit,
  });
  const res = await authFetch(`${BASE_BUDGET_LINES}/${budgetLineId}/events${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedResponse<FinancialEventForLine>>;
}

export async function listBudgetLineAllocations(
  authFetch: AuthFetch,
  budgetLineId: string,
  params?: { offset?: number; limit?: number },
): Promise<PaginatedResponse<FinancialAllocationForLine>> {
  const qs = buildQueryString({
    offset: params?.offset,
    limit: params?.limit,
  });
  const res = await authFetch(`${BASE_BUDGET_LINES}/${budgetLineId}/allocations${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedResponse<FinancialAllocationForLine>>;
}

export async function createFinancialEvent(
  authFetch: AuthFetch,
  payload: CreateFinancialEventPayload,
): Promise<FinancialEventForLine> {
  const res = await authFetch(BASE_FINANCIAL_EVENTS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<FinancialEventForLine>;
}

