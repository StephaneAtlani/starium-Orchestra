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

/** Forme renvoyée par Nest (`BudgetWithKpi`) — champs budget à la racine, pas sous `budget`. */
interface BudgetWithKpiApiRow {
  id: string;
  name: string;
  code: string | null;
  currency: string;
  status: string;
  description?: string | null;
  ownerOrgUnitId?: string | null;
  ownerOrgUnitSummary?: BudgetListItemWithKpi['budget']['ownerOrgUnitSummary'];
  visual: BudgetListItemWithKpi['budget']['visual'];
  expenseMix?: BudgetListItemWithKpi['budget']['expenseMix'];
  kpi: BudgetSummaryKpi;
}

function isNestedBudgetListItem(
  item: BudgetWithKpiApiRow | BudgetListItemWithKpi,
): item is BudgetListItemWithKpi {
  return 'budget' in item && typeof item.budget?.id === 'string';
}

function normalizeBudgetListItem(
  item: BudgetWithKpiApiRow | BudgetListItemWithKpi,
): BudgetListItemWithKpi {
  if (isNestedBudgetListItem(item)) {
    return item;
  }
  return {
    budget: {
      id: item.id,
      name: item.name,
      code: item.code,
      currency: item.currency,
      status: item.status,
      description: item.description ?? null,
      ownerOrgUnitId: item.ownerOrgUnitId ?? null,
      ownerOrgUnitSummary: item.ownerOrgUnitSummary ?? null,
      visual: item.visual,
      expenseMix: item.expenseMix ?? null,
    },
    kpi: item.kpi,
  };
}

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
  const raw = await handleResponse<PaginatedReportingResponse<BudgetWithKpiApiRow>>(res);
  return {
    ...raw,
    items: raw.items.map(normalizeBudgetListItem),
  };
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
