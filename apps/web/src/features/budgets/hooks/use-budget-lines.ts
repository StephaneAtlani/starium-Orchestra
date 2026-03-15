'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { fetchAllLinesForBudget } from '../lib/fetch-budget-explorer-data';

/**
 * Charge toutes les lignes du budget sans filtres API.
 * Le filtrage de l’explorer est fait uniquement côté client (filter-budget-tree).
 */
export function useBudgetLinesByBudget(budgetId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, budgetId ?? ''),
    queryFn: () => fetchAllLinesForBudget(authFetch, budgetId!),
    enabled: !!clientId && !!budgetId,
  });
}
