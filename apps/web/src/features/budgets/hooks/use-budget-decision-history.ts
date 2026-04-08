'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { getBudgetDecisionHistory } from '../api/budget-management.api';
import type { ListBudgetDecisionHistoryQuery } from '../types/budget-management.types';

export function useBudgetDecisionHistory(
  budgetId: string | null,
  query?: ListBudgetDecisionHistoryQuery,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.budgetDecisionHistory(clientId, budgetId ?? '', query),
    queryFn: () => getBudgetDecisionHistory(authFetch, budgetId!, query),
    enabled: !!clientId && !!budgetId,
  });
}
