'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { clientRbacKeys } from '@/features/client-rbac/query-keys';
import { assignPlatformUserLicense, type AssignUserLicensePayload } from '../api/licenses';
import { licensesKeys } from '../query-keys';

export function useAssignPlatformLicense(clientId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { userId: string; payload: AssignUserLicensePayload }) =>
      assignPlatformUserLicense(authFetch, clientId, args.userId, args.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: licensesKeys.platformUsage(clientId),
      });
      void queryClient.invalidateQueries({
        queryKey: licensesKeys.platformSubscriptions(clientId),
      });
      void queryClient.invalidateQueries({
        queryKey: clientRbacKeys.members(clientId),
      });
      toast.success('Licence utilisateur mise à jour.');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Impossible d'affecter la licence.");
    },
  });
}
