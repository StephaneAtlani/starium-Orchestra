import type {
  BudgetComparisonMode,
  BudgetComparisonResponse,
} from '../types/budget-forecast.types';

export type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

async function readErrorMessage(res: Response): Promise<string | undefined> {
  try {
    const text = await res.text();
    if (!text) return undefined;
    const j = JSON.parse(text) as { message?: string | string[] };
    if (typeof j.message === 'string') return j.message;
    if (Array.isArray(j.message)) return j.message.join(' ');
  } catch {
    return undefined;
  }
  return undefined;
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
    const apiMsg = await readErrorMessage(res);
    if (res.status === 404) {
      throw new Error(apiMsg ?? 'Périmètre de comparaison introuvable');
    }
    throw new Error(
      apiMsg ?? 'Erreur lors de la comparaison budgétaire',
    );
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
    const apiMsg = await readErrorMessage(res);
    throw new Error(apiMsg ?? 'Erreur lors de la comparaison des snapshots');
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
    const apiMsg = await readErrorMessage(res);
    throw new Error(apiMsg ?? 'Erreur lors de la comparaison des versions');
  }
  return res.json();
}
