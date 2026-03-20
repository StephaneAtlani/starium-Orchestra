'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../../budgets/lib/budget-query-keys';
import { createPurchaseOrder } from '../api/procurement.api';
import type { CreatePurchaseOrderPayload } from '../types/purchase-order.types';

export function useCreatePurchaseOrder(
  budgetId: string | null,
  budgetLineId: string | null,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (payload: CreatePurchaseOrderPayload) =>
      createPurchaseOrder(authFetch, payload),
    onSuccess: () => {
      if (budgetId) {
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetSummary(clientId, budgetId),
        });
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, budgetId),
        });
      }
      if (budgetLineId) {
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetLineDetail(clientId, budgetLineId),
        });
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.timeline(clientId, budgetLineId),
        });
        queryClient.invalidateQueries({
          predicate: (q) => {
            const key = q.queryKey;
            return (
              Array.isArray(key) &&
              key[0] === 'budgets' &&
              key[1] === clientId &&
              key[3] === budgetLineId &&
              (key[2] === 'budget-line-events' ||
                key[2] === 'budget-line-allocations' ||
                key[2] === 'budget-line-purchase-orders' ||
                key[2] === 'budget-line-invoices')
            );
          },
        });
      }
    },
  });
}

