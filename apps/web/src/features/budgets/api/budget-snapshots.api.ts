import type { ListBudgetSnapshotsResult } from '../types/budget-snapshots-list.types';

export type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export async function listBudgetSnapshots(
  authFetch: AuthFetch,
  budgetId: string,
  params?: { limit?: number; offset?: number },
): Promise<ListBudgetSnapshotsResult> {
  const search = new URLSearchParams();
  search.set('budgetId', budgetId);
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.offset != null) search.set('offset', String(params.offset));
  const res = await authFetch(`/api/budget-snapshots?${search.toString()}`);
  if (!res.ok) {
    throw new Error('Erreur lors du chargement des snapshots');
  }
  return res.json();
}
