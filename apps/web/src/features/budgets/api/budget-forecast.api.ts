import type {
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

export {
  compareBudget,
  compareSnapshots,
  compareVersions,
} from './budget-comparison.api';
