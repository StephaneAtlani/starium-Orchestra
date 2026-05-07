'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  createPlatformSubscription,
  type CreateClientSubscriptionPayload,
} from '../api/licenses';
import { licensesKeys } from '../query-keys';

export function useCreatePlatformSubscription(clientId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateClientSubscriptionPayload) =>
      createPlatformSubscription(authFetch, clientId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: licensesKeys.platformSubscriptions(clientId),
      });
      void queryClient.invalidateQueries({
        queryKey: licensesKeys.platformUsage(clientId),
      });
      toast.success('Abonnement créé.');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Impossible de créer l'abonnement.");
    },
  });
}
