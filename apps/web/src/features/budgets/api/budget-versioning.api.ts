import type { BudgetVersionSummaryDto } from '../types/budget-version-history.types';

export type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export async function getVersionHistory(
  authFetch: AuthFetch,
  budgetId: string,
): Promise<BudgetVersionSummaryDto[]> {
  const res = await authFetch(`/api/budgets/${budgetId}/version-history`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Budget introuvable');
    const text = await res.text();
    let msg = 'Erreur lors du chargement des versions';
    try {
      const j = JSON.parse(text) as { message?: string | string[] };
      if (typeof j.message === 'string') msg = j.message;
      else if (Array.isArray(j.message)) msg = j.message.join(' ');
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}
