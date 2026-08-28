'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { getBudgetLanding } from '@/features/budgets/api/budget-landing.api';

const STALE_MS = 45_000;

export function useBudgetLanding(budgetId: string | null, options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = (options?.enabled ?? true) && !!clientId && !!budgetId;

  return useQuery({
    queryKey: budgetQueryKeys.budgetLanding(clientId, budgetId ?? ''),
    queryFn: () => getBudgetLanding(authFetch, budgetId!),
    enabled,
    staleTime: STALE_MS,
  });
}
