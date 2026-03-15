'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { createBudget } from '../api/budget-management.api';
import { budgetDetail } from '../constants/budget-routes';
import type { CreateBudgetInput } from '../schemas/create-budget.schema';
import { budgetFormToCreatePayload } from '../mappers/budget-form.mappers';
import type { ApiFormError } from '../api/types';

export function useCreateBudget() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (values: CreateBudgetInput) => {
      const payload = budgetFormToCreatePayload(values);
      return createBudget(authFetch, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetList(clientId) });
      toast.success('Budget créé.');
      router.push(budgetDetail(data.id));
    },
    onError: (err: ApiFormError) => {
      throw err;
    },
  });
}
