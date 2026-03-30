/**
 * API budget-dashboard — vue cockpit (lecture seule).
 */

import type {
  BudgetCockpitResponse,
  BudgetDashboardConfigDto,
  BudgetDashboardQueryParams,
} from '../types/budget-dashboard.types';

export type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export async function getDashboard(
  authFetch: AuthFetch,
  params?: BudgetDashboardQueryParams,
): Promise<BudgetCockpitResponse> {
  const search = new URLSearchParams();
  if (params?.exerciseId) search.set('exerciseId', params.exerciseId);
  if (params?.budgetId) search.set('budgetId', params.budgetId);
  if (params?.includeEnvelopes === false) search.set('includeEnvelopes', 'false');
  if (params?.includeLines === false) search.set('includeLines', 'false');
  const qs = search.toString();
  const url = qs ? `/api/budget-dashboard?${qs}` : '/api/budget-dashboard';
  const res = await authFetch(url);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Aucun budget ou exercice trouvé');
    throw new Error('Erreur lors du chargement du dashboard budget');
  }
  return res.json() as Promise<BudgetCockpitResponse>;
}

export async function listBudgetDashboardConfigs(
  authFetch: AuthFetch,
): Promise<BudgetDashboardConfigDto[]> {
  const res = await authFetch('/api/budget-dashboard/configs');
  if (!res.ok) {
    throw new Error('Erreur lors du chargement des configurations cockpit');
  }
  return res.json();
}

export async function patchBudgetDashboardConfig(
  authFetch: AuthFetch,
  id: string,
  body: Record<string, unknown>,
): Promise<BudgetDashboardConfigDto> {
  const res = await authFetch(`/api/budget-dashboard/configs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || 'Erreur lors de la mise à jour');
  }
  return res.json();
}
