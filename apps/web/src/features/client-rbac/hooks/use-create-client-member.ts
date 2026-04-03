'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '../query-keys';
import {
  createClientMember,
  type CreateClientMemberPayload,
} from '../api/user-roles';

export function useCreateClientMember() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (payload: CreateClientMemberPayload) =>
      createClientMember(authFetch, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: clientRbacKeys.members(activeClientId),
      });
      void queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}
