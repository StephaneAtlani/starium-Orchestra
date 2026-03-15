'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { updateBudget } from '../api/budget-management.api';
import { budgetDetail } from '../constants/budget-routes';
import type { CreateBudgetInput } from '../schemas/create-budget.schema';
import { budgetFormToUpdatePayload } from '../mappers/budget-form.mappers';
import type { ApiFormError } from '../api/types';

export function useUpdateBudget(budgetId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (values: CreateBudgetInput) => {
      if (!budgetId) throw new Error('ID budget manquant');
      const payload = budgetFormToUpdatePayload(values);
      return updateBudget(authFetch, budgetId, payload);
    },
    onSuccess: (_data, _variables, context) => {
      if (budgetId) queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId) });
      queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetList(clientId) });
      toast.success('Budget mis à jour.');
      router.push(budgetDetail(budgetId!));
    },
    onError: (err: ApiFormError) => {
      throw err;
    },
  });
}
