'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { updateBudget } from '../api/budget-management.api';

/** PATCH `ownerOrgUnitId` sur le budget (RFC-ORG-003). */
export function usePatchBudgetOrgUnit(budgetId: string | null, options?: { silentSuccess?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (ownerOrgUnitId: string | null) => {
      if (!budgetId) throw new Error('ID budget manquant');
      return updateBudget(authFetch, budgetId, {
        ownerOrgUnitId: ownerOrgUnitId ?? null,
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
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, budgetId),
          }),
        ]);
      }
      if (!options?.silentSuccess) {
        toast.success('Direction propriétaire du budget mise à jour.');
      }
    },
    onError: (e: Error) => {
      toast.error(e?.message ?? 'Impossible de mettre à jour la direction propriétaire.');
    },
  });
}
