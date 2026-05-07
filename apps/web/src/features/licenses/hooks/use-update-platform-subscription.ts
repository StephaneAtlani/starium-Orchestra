'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  updatePlatformSubscription,
  type UpdateClientSubscriptionPayload,
} from '../api/licenses';
import { licensesKeys } from '../query-keys';

export function useUpdatePlatformSubscription(clientId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      subscriptionId: string;
      payload: UpdateClientSubscriptionPayload;
    }) =>
      updatePlatformSubscription(
        authFetch,
        clientId,
        args.subscriptionId,
        args.payload,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: licensesKeys.platformSubscriptions(clientId),
      });
      void queryClient.invalidateQueries({
        queryKey: licensesKeys.platformUsage(clientId),
      });
      toast.success('Abonnement mis à jour.');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Impossible de mettre à jour l'abonnement.");
    },
  });
}
