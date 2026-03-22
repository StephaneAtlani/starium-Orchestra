'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listPurchaseOrdersByBudgetLine } from '../api/procurement.api';

export function usePurchaseOrdersByBudgetLine(
  budgetLineId: string | null,
  enabled = true,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: ['procurement', clientId, 'budget-line-purchase-orders', budgetLineId],
    queryFn: () =>
      listPurchaseOrdersByBudgetLine(authFetch, budgetLineId!, {
        limit: 50,
        offset: 0,
      }),
    enabled: enabled && !!clientId && !!budgetLineId,
  });
}

