'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { getLine } from '../api/budget-management.api';

export function useBudgetLineDetail(budgetLineId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.budgetLineDetail(clientId, budgetLineId ?? ''),
    queryFn: () => getLine(authFetch, budgetLineId!),
    enabled: !!clientId && !!budgetLineId,
  });
}

