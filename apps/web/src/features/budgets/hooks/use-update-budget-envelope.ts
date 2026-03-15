'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { updateEnvelope } from '../api/budget-management.api';
import { budgetDetail } from '../constants/budget-routes';
import type { CreateEnvelopeInput } from '../schemas/create-envelope.schema';
import { envelopeFormToUpdatePayload } from '../mappers/budget-form.mappers';
import type { ApiFormError } from '../api/types';

export function useUpdateBudgetEnvelope(envelopeId: string | null, budgetId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (values: CreateEnvelopeInput) => {
      if (!envelopeId) throw new Error('ID enveloppe manquant');
      const payload = envelopeFormToUpdatePayload(values);
      return updateEnvelope(authFetch, envelopeId, payload);
    },
    onSuccess: (_data, _variables, context) => {
      if (budgetId) {
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetEnvelopes(clientId, budgetId) });
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId) });
      }
      toast.success('Enveloppe mise à jour.');
      if (budgetId) router.push(budgetDetail(budgetId));
    },
    onError: (err: ApiFormError) => {
      throw err;
    },
  });
}
