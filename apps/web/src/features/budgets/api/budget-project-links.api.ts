import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { parseApiFormError } from '@/features/budgets/api/budget-management.api';
import type {
  BudgetLineProjectLinksPage,
  BudgetProjectBudgetKpisResponse,
} from '../types/budget-project-links.types';

function qs(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

/** RFC-PROJ-010-B lot A */
export async function listBudgetLineProjectLinks(
  authFetch: AuthFetch,
  budgetLineId: string,
  params?: { limit?: number; offset?: number },
): Promise<BudgetLineProjectLinksPage> {
  const res = await authFetch(
    `/api/budget-lines/${budgetLineId}/project-links${qs(params)}`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<BudgetLineProjectLinksPage>;
}

/** RFC-PROJ-010-B lot B */
export async function getBudgetProjectBudgetKpis(
  authFetch: AuthFetch,
  budgetId: string,
): Promise<BudgetProjectBudgetKpisResponse> {
  const res = await authFetch(`/api/budgets/${budgetId}/project-budget-kpis`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<BudgetProjectBudgetKpisResponse>;
}
