'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { updateEnvelope, type UpdateEnvelopePayload } from '../api/budget-management.api';
import type { ApiFormError } from '../api/types';

/** PATCH enveloppe (statut / report) sans redirection — drawer, cartes contexte. */
export function usePatchBudgetEnvelope(
  envelopeId: string | null,
  budgetId: string | null,
  options?: { silentSuccess?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (payload: UpdateEnvelopePayload) => {
      if (!envelopeId) throw new Error('ID enveloppe manquant');
      return updateEnvelope(authFetch, envelopeId, payload);
    },
    onSuccess: async () => {
      if (clientId && budgetId) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetEnvelopes(clientId, budgetId),
          }),
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId),
          }),
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.dashboardAll(clientId),
          }),
          envelopeId
            ? queryClient.invalidateQueries({
                queryKey: budgetQueryKeys.budgetEnvelopeDetail(clientId, envelopeId),
              })
            : Promise.resolve(),
        ]);
      }
      if (!options?.silentSuccess) {
        toast.success('Enveloppe mise à jour.');
      }
    },
    onError: (err: ApiFormError) => {
      toast.error(err?.message ?? 'Impossible de mettre à jour l’enveloppe.');
    },
  });
}
