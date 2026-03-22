'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { listBudgetLineAllocations } from '../api/budget-line-financial.api';

export interface UseBudgetLineAllocationsParams {
  budgetLineId: string | null;
  offset: number;
  limit: number;
  enabled?: boolean;
}

export function useBudgetLineAllocations({
  budgetLineId,
  offset,
  limit,
  enabled = true,
}: UseBudgetLineAllocationsParams) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const filters = { offset, limit };

  return useQuery({
    queryKey: budgetQueryKeys.budgetLineAllocations(clientId, budgetLineId ?? '', filters),
    queryFn: () => listBudgetLineAllocations(authFetch, budgetLineId!, filters),
    enabled: enabled && !!clientId && !!budgetLineId,
  });
}

