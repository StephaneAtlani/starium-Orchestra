'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { updateBudget } from '../api/budget-management.api';

/** PATCH `ownerUserId` sur le budget (responsable affiché sur la ligne). */
export function usePatchBudgetOwner(budgetId: string | null, options?: { silentSuccess?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (ownerUserId: string | null) => {
      if (!budgetId) throw new Error('ID budget manquant');
      return updateBudget(authFetch, budgetId, {
        ownerUserId: ownerUserId ?? '',
      });
    },
    onSuccess: async () => {
      if (clientId && budgetId) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId),
          }),
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetSummary(clientId, budgetId),
          }),
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.dashboardAll(clientId),
          }),
        ]);
      }
      if (!options?.silentSuccess) {
        toast.success('Responsable du budget mis à jour.');
      }
    },
    onError: (e: Error) => {
      toast.error(e?.message ?? 'Impossible de mettre à jour le responsable.');
    },
  });
}
