'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { accessGroupsKeys } from '../query-keys';
import { addAccessGroupMember } from '../api/access-groups';

export function useAddGroupMember(groupId: string | undefined) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (userId: string) => {
      if (!groupId) throw new Error('groupId required');
      return addAccessGroupMember(authFetch, groupId, userId);
    },
    onSuccess: () => {
      if (!groupId) return;
      void queryClient.invalidateQueries({
        queryKey: accessGroupsKeys.members(activeClientId, groupId),
      });
      void queryClient.invalidateQueries({
        queryKey: accessGroupsKeys.group(activeClientId, groupId),
      });
      void queryClient.invalidateQueries({
        queryKey: accessGroupsKeys.list(activeClientId),
      });
      toast.success('Membre ajouté au groupe.');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Impossible d'ajouter le membre.");
    },
  });
}
