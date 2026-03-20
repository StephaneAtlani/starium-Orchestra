'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { getDashboard } from '../api/budget-dashboard.api';
import type { BudgetDashboardQueryParams } from '../types/budget-dashboard.types';

export function useBudgetDashboardQuery(params?: BudgetDashboardQueryParams) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.dashboard(clientId, params),
    queryFn: () => getDashboard(authFetch, params),
    enabled: !!clientId,
  });
}

/** Alias RFC-FE-002 — même comportement que useBudgetDashboardQuery. */
export const useBudgetDashboard = useBudgetDashboardQuery;
