'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { createLine } from '../api/budget-management.api';
import { budgetDetail } from '../constants/budget-routes';
import type { BudgetLineFormValues } from '../schemas/budget-line-form.schema';
import { lineFormToCreatePayload } from '../mappers/budget-form.mappers';
import type { ApiFormError } from '../api/types';

export function useCreateBudgetLine(budgetId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (values: BudgetLineFormValues) => {
      const payload = lineFormToCreatePayload(values);
      return createLine(authFetch, payload);
    },
    onSuccess: (_data, variables) => {
      const bid = variables.budgetId || budgetId;
      if (bid) {
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, bid) });
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetDetail(clientId, bid) });
      }
      toast.success('Ligne créée.');
      if (bid) router.push(budgetDetail(bid));
    },
    onError: (err: ApiFormError) => {
      throw err;
    },
  });
}
