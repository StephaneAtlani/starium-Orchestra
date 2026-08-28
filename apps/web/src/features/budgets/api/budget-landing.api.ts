import type {
  BudgetLandingBudgetResponse,
  BudgetLandingEnvelopeLinesResponse,
  BudgetLandingEnvelopeResponse,
} from '../types/budget-landing.types';

export type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export async function getBudgetLanding(
  authFetch: AuthFetch,
  budgetId: string,
): Promise<BudgetLandingBudgetResponse> {
  const res = await authFetch(`/api/budget-landing/budgets/${budgetId}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Budget introuvable');
    throw new Error("Erreur lors du chargement de l'atterrissage budget");
  }
  return res.json();
}

export async function getEnvelopeLanding(
  authFetch: AuthFetch,
  envelopeId: string,
): Promise<BudgetLandingEnvelopeResponse> {
  const res = await authFetch(`/api/budget-landing/envelopes/${envelopeId}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Enveloppe introuvable');
    throw new Error("Erreur lors du chargement de l'atterrissage enveloppe");
  }
  return res.json();
}

export async function listEnvelopeLandingLines(
  authFetch: AuthFetch,
  envelopeId: string,
  params?: { limit?: number; offset?: number },
): Promise<BudgetLandingEnvelopeLinesResponse> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.offset != null) search.set('offset', String(params.offset));
  const qs = search.toString();
  const url = qs
    ? `/api/budget-landing/envelopes/${envelopeId}/lines?${qs}`
    : `/api/budget-landing/envelopes/${envelopeId}/lines`;
  const res = await authFetch(url);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Enveloppe introuvable');
    throw new Error('Erreur lors du chargement des lignes atterrissage');
  }
  return res.json();
}
