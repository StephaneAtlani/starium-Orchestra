'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { accessGroupsKeys } from '../query-keys';
import {
  type UpdateAccessGroupPayload,
  updateAccessGroup,
} from '../api/access-groups';

export function useUpdateAccessGroup() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (args: { groupId: string; dto: UpdateAccessGroupPayload }) =>
      updateAccessGroup(authFetch, args.groupId, args.dto),
    onSuccess: (_data, { groupId }) => {
      void queryClient.invalidateQueries({
        queryKey: accessGroupsKeys.list(activeClientId),
      });
      void queryClient.invalidateQueries({
        queryKey: accessGroupsKeys.group(activeClientId, groupId),
      });
      toast.success('Groupe mis à jour.');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Impossible de mettre à jour le groupe.');
    },
  });
}
