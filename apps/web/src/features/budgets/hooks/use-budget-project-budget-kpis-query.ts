'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { getBudgetProjectBudgetKpis } from '../api/budget-project-links.api';

export function useBudgetProjectBudgetKpisQuery(
  budgetId: string | null,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = (options?.enabled ?? true) && !!clientId && !!budgetId;

  return useQuery({
    queryKey: budgetQueryKeys.budgetProjectBudgetKpis(clientId, budgetId ?? ''),
    queryFn: () => getBudgetProjectBudgetKpis(authFetch, budgetId!),
    enabled,
  });
}
