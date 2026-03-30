import type {
  BudgetComparisonMode,
  BudgetComparisonResponse,
  BudgetForecastResponse,
  EnvelopeForecastLinesResponse,
  EnvelopeForecastResponse,
} from '../types/budget-forecast.types';

export type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export async function getBudgetForecast(
  authFetch: AuthFetch,
  budgetId: string,
): Promise<BudgetForecastResponse> {
  const res = await authFetch(`/api/budget-forecast/budgets/${budgetId}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Budget introuvable');
    throw new Error('Erreur lors du chargement du forecast budget');
  }
  return res.json();
}

export async function getEnvelopeForecast(
  authFetch: AuthFetch,
  envelopeId: string,
): Promise<EnvelopeForecastResponse> {
  const res = await authFetch(`/api/budget-forecast/envelopes/${envelopeId}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Enveloppe introuvable');
    throw new Error('Erreur lors du chargement du forecast enveloppe');
  }
  return res.json();
}

export async function listEnvelopeForecastLines(
  authFetch: AuthFetch,
  envelopeId: string,
  params?: { limit?: number; offset?: number },
): Promise<EnvelopeForecastLinesResponse> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.offset != null) search.set('offset', String(params.offset));
  const qs = search.toString();
  const url = qs
    ? `/api/budget-forecast/envelopes/${envelopeId}/lines?${qs}`
    : `/api/budget-forecast/envelopes/${envelopeId}/lines`;
  const res = await authFetch(url);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Enveloppe introuvable');
    throw new Error('Erreur lors du chargement des lignes forecast');
  }
  return res.json();
}

export async function compareBudget(
  authFetch: AuthFetch,
  budgetId: string,
  mode: BudgetComparisonMode,
  targetId?: string,
): Promise<BudgetComparisonResponse> {
  const search = new URLSearchParams();
  search.set('compareTo', mode);
  if (targetId) search.set('targetId', targetId);
  const res = await authFetch(
    `/api/budget-comparisons/budgets/${budgetId}?${search.toString()}`,
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error('Périmètre de comparaison introuvable');
    throw new Error('Erreur lors de la comparaison budgétaire');
  }
  return res.json();
}

export async function compareSnapshots(
  authFetch: AuthFetch,
  leftId: string,
  rightId: string,
): Promise<BudgetComparisonResponse> {
  const qs = new URLSearchParams({ leftId, rightId }).toString();
  const res = await authFetch(`/api/budget-comparisons/snapshots?${qs}`);
  if (!res.ok) {
    throw new Error('Erreur lors de la comparaison des snapshots');
  }
  return res.json();
}

export async function compareVersions(
  authFetch: AuthFetch,
  leftId: string,
  rightId: string,
): Promise<BudgetComparisonResponse> {
  const qs = new URLSearchParams({ leftId, rightId }).toString();
  const res = await authFetch(`/api/budget-comparisons/versions?${qs}`);
  if (!res.ok) {
    throw new Error('Erreur lors de la comparaison des versions');
  }
  return res.json();
}
