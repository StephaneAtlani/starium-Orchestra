'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { getBudgetSummary } from '../api/budget-reporting.api';

export function useBudgetSummary(budgetId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.budgetSummary(clientId, budgetId ?? ''),
    queryFn: () => getBudgetSummary(authFetch, budgetId!),
    enabled: !!clientId && !!budgetId,
  });
}
