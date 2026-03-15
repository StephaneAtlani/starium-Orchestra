'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import * as api from '../api/budget-management.api';
import type { ListBudgetsQuery } from '../types/budget-management.types';

export function useBudgetsList(query?: ListBudgetsQuery) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.budgetList(clientId, query),
    queryFn: () => api.listBudgets(authFetch, query),
    enabled: !!clientId,
  });
}

export function useBudgetDetail(budgetId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId ?? ''),
    queryFn: () => api.getBudget(authFetch, budgetId!),
    enabled: !!clientId && !!budgetId,
  });
}
