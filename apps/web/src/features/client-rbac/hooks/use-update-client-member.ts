'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '../query-keys';
import {
  updateClientMember,
  type UpdateClientMemberPayload,
} from '../api/user-roles';

export function useUpdateClientMember(userId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (payload: UpdateClientMemberPayload) =>
      updateClientMember(authFetch, userId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: clientRbacKeys.members(activeClientId),
      });
    },
  });
}
