'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '@/features/client-rbac/query-keys';
import { assignClientUserLicense, type AssignUserLicensePayload } from '../api/licenses';
import { licensesKeys } from '../query-keys';

export function useAssignClientLicense() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (args: { userId: string; payload: AssignUserLicensePayload }) =>
      assignClientUserLicense(authFetch, args.userId, args.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: licensesKeys.clientUsage(activeClientId),
      });
      void queryClient.invalidateQueries({
        queryKey: clientRbacKeys.members(activeClientId),
      });
      toast.success('Licence utilisateur mise à jour.');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Impossible d'affecter la licence.");
    },
  });
}
