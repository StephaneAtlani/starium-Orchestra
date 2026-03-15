'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { fetchAllEnvelopesForBudget } from '../lib/fetch-budget-explorer-data';

/**
 * Charge toutes les enveloppes du budget (boucle pagination).
 * Query key avec { full: true } pour distinguer du cache listes paginées.
 */
export function useBudgetEnvelopesAll(budgetId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.budgetEnvelopes(clientId, budgetId ?? '', { full: true }),
    queryFn: () => fetchAllEnvelopesForBudget(authFetch, budgetId!),
    enabled: !!clientId && !!budgetId,
  });
}
