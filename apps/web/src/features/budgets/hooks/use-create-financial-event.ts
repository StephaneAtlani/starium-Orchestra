'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { createFinancialEvent } from '../api/budget-line-financial.api';
import type { CreateFinancialEventPayload } from '../api/budget-line-financial.api';
import type { ApiFormError } from '../api/types';

export function useCreateFinancialEvent(budgetId: string | null, budgetLineId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (payload: CreateFinancialEventPayload) => {
      if (!budgetLineId) throw new Error('ID ligne manquant');
      return createFinancialEvent(authFetch, payload);
    },
    onSuccess: () => {
      if (budgetId) {
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetSummary(clientId, budgetId) });
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, budgetId) });
      }

      if (budgetLineId) {
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetLineDetail(clientId, budgetLineId) });
        queryClient.invalidateQueries({
          predicate: (q) => {
            const key = q.queryKey;
            return (
              Array.isArray(key) &&
              key[0] === 'budgets' &&
              key[1] === clientId &&
              key[3] === budgetLineId &&
              (key[2] === 'budget-line-events' || key[2] === 'budget-line-allocations')
            );
          },
        });
      }

      toast.success('Événement financier créé.');
    },
    onError: (err: ApiFormError) => {
      throw err;
    },
  });
}

