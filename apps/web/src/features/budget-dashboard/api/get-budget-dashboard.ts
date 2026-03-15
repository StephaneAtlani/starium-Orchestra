import type { BudgetDashboardQueryParams, BudgetDashboardResponse } from '../types/budget-dashboard.types';

export type AuthFetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export async function getBudgetDashboard(
  authFetch: AuthFetch,
  params?: BudgetDashboardQueryParams,
): Promise<BudgetDashboardResponse> {
  const search = new URLSearchParams();
  if (params?.exerciseId) search.set('exerciseId', params.exerciseId);
  if (params?.budgetId) search.set('budgetId', params.budgetId);
  if (params?.includeEnvelopes === false) search.set('includeEnvelopes', 'false');
  if (params?.includeLines === false) search.set('includeLines', 'false');
  const qs = search.toString();
  const url = qs ? `/api/budget-dashboard?${qs}` : '/api/budget-dashboard';
  const res = await authFetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Aucun budget ou exercice trouvé');
    }
    throw new Error('Erreur lors du chargement du dashboard budget');
  }
  return res.json() as Promise<BudgetDashboardResponse>;
}
