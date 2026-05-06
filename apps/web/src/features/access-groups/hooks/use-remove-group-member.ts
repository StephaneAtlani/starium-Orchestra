'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { accessGroupsKeys } from '../query-keys';
import { removeAccessGroupMember } from '../api/access-groups';

export function useRemoveGroupMember(groupId: string | undefined) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (userId: string) => {
      if (!groupId) throw new Error('groupId required');
      return removeAccessGroupMember(authFetch, groupId, userId);
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
      toast.success('Membre retiré du groupe.');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Impossible de retirer le membre.');
    },
  });
}
