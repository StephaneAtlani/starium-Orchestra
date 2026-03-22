'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { getBudgets } from '../api/get-budgets';
import type { BudgetsListParams } from '../types/budget-list.types';

const STALE_TIME_MS = 60_000;

export function useBudgetsQuery(
  filters: BudgetsListParams,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: budgetQueryKeys.budgetsList(clientId, filters),
    queryFn: () => getBudgets(authFetch, filters),
    enabled: !!clientId && enabled,
    placeholderData: (previousData) => previousData,
    staleTime: STALE_TIME_MS,
  });
}
