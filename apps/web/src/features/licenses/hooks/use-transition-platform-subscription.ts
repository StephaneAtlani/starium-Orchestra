'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { transitionPlatformSubscription } from '../api/licenses';
import { licensesKeys } from '../query-keys';

export function useTransitionPlatformSubscription(clientId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      subscriptionId: string;
      action: 'activate' | 'suspend' | 'cancel';
    }) =>
      transitionPlatformSubscription(
        authFetch,
        clientId,
        args.subscriptionId,
        args.action,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: licensesKeys.platformSubscriptions(clientId),
      });
      void queryClient.invalidateQueries({
        queryKey: licensesKeys.platformUsage(clientId),
      });
      toast.success('Statut abonnement mis à jour.');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Transition abonnement impossible.');
    },
  });
}
