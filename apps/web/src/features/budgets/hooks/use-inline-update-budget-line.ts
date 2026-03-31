'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { updateLine, type UpdateLinePayload } from '../api/budget-management.api';
import type { ApiFormError } from '../api/types';

export function useInlineUpdateBudgetLine(
  lineId: string | null,
  budgetId: string | null,
  options?: { silentSuccess?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (payload: UpdateLinePayload) => {
      if (!lineId) throw new Error('ID ligne manquant');
      return updateLine(authFetch, lineId, payload);
    },
    onSuccess: async () => {
      if (clientId && budgetId) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, budgetId),
          }),
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId),
          }),
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetSummary(clientId, budgetId),
          }),
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.dashboardAll(clientId),
          }),
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetEnvelopeLinesAll(clientId),
          }),
          lineId
            ? queryClient.invalidateQueries({
                queryKey: budgetQueryKeys.budgetLineDetail(clientId, lineId),
              })
            : Promise.resolve(),
          lineId
            ? queryClient.invalidateQueries({
                queryKey: budgetQueryKeys.timeline(clientId, lineId),
              })
            : Promise.resolve(),
        ]);
      }
      if (!options?.silentSuccess) {
        toast.success('Ligne mise à jour.');
      }
    },
    onError: (err: ApiFormError) => {
      toast.error(err?.message ?? 'Impossible de mettre à jour la ligne.');
    },
  });
}

