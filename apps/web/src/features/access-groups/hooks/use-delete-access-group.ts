'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { accessGroupsKeys } from '../query-keys';
import { deleteAccessGroup } from '../api/access-groups';

export function useDeleteAccessGroup(groupIdFromHook?: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (groupIdArg?: string) => {
      const id = groupIdArg ?? groupIdFromHook;
      if (!id) throw new Error('groupId required');
      return deleteAccessGroup(authFetch, id);
    },
    onSuccess: (_, groupIdArg) => {
      const id = groupIdArg ?? groupIdFromHook;
      void queryClient.invalidateQueries({
        queryKey: accessGroupsKeys.list(activeClientId),
      });
      if (id) {
        void queryClient.invalidateQueries({
          queryKey: accessGroupsKeys.group(activeClientId, id),
        });
      }
      toast.success('Groupe supprimé.');
      if (groupIdFromHook) router.push('/client/access-groups');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Impossible de supprimer le groupe.');
    },
  });
}
