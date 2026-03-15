'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { updateLine } from '../api/budget-management.api';
import { budgetDetail } from '../constants/budget-routes';
import type { BudgetLineFormValues } from '../schemas/budget-line-form.schema';
import { lineFormToUpdatePayload } from '../mappers/budget-form.mappers';
import type { ApiFormError } from '../api/types';

export function useUpdateBudgetLine(lineId: string | null, budgetId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (values: BudgetLineFormValues) => {
      if (!lineId) throw new Error('ID ligne manquant');
      const payload = lineFormToUpdatePayload(values);
      return updateLine(authFetch, lineId, payload);
    },
    onSuccess: (_data, _variables, context) => {
      if (budgetId) {
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, budgetId) });
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId) });
      }
      toast.success('Ligne mise à jour.');
      if (budgetId) router.push(budgetDetail(budgetId));
    },
    onError: (err: ApiFormError) => {
      throw err;
    },
  });
}
