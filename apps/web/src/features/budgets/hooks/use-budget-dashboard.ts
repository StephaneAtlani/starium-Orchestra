'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { getDashboard, getBudgetMonthlyBreakdown } from '../api/budget-dashboard.api';
import type { BudgetDashboardQueryParams } from '../types/budget-dashboard.types';

export function useBudgetDashboardQuery(
  params?: BudgetDashboardQueryParams,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const extraEnabled = options?.enabled ?? true;

  return useQuery({
    queryKey: budgetQueryKeys.dashboard(clientId, params),
    queryFn: () => getDashboard(authFetch, params),
    enabled: !!clientId && extraEnabled,
  });
}

/** Alias RFC-FE-002 — même comportement que useBudgetDashboardQuery. */
export const useBudgetDashboard = useBudgetDashboardQuery;

export function useBudgetMonthlyBreakdownQuery(
  params: { budgetId: string; month: string } | null,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const extraEnabled = options?.enabled ?? true;
  const budgetId = params?.budgetId ?? '';
  const month = params?.month ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.monthlyBreakdown(clientId, budgetId, month),
    queryFn: () => getBudgetMonthlyBreakdown(authFetch, { budgetId, month }),
    enabled: !!clientId && !!budgetId && !!month && extraEnabled,
  });
}
