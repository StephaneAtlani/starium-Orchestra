'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { listEnvelopes } from '../api/budget-management.api';

/**
 * Options enveloppes pour un budget (formulaire ligne).
 */
export function useBudgetEnvelopeOptions(budgetId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: [...budgetQueryKeys.budgetEnvelopes(clientId, budgetId ?? ''), 'options'],
    queryFn: () => listEnvelopes(authFetch, { budgetId: budgetId!, limit: 200 }),
    enabled: !!clientId && !!budgetId,
  });
}
