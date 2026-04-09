'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { createEnvelope } from '../api/budget-management.api';
import { budgetDetail } from '../constants/budget-routes';
import type { CreateEnvelopeInput } from '../schemas/create-envelope.schema';
import { envelopeFormToCreatePayload } from '../mappers/budget-form.mappers';
import type { ApiFormError } from '../api/types';

export function useCreateBudgetEnvelope(budgetId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (values: CreateEnvelopeInput) => {
      const payload = envelopeFormToCreatePayload(values);
      return createEnvelope(authFetch, payload);
    },
    onSuccess: (_data, variables) => {
      const bid = variables.budgetId || budgetId;
      if (bid) {
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetEnvelopes(clientId, bid) });
        queryClient.invalidateQueries({ queryKey: budgetQueryKeys.budgetDetail(clientId, bid) });
      }
      toast.success('Enveloppe créée.');
      if (bid) router.push(budgetDetail(bid));
    },
    onError: (err: ApiFormError) => {
      throw err;
    },
  });
}
