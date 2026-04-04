'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '../query-keys';
import { deleteRole } from '../api/roles';

export function useDeleteRole(roleIdFromHook?: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (roleIdArg?: string) => {
      const id = roleIdArg ?? roleIdFromHook;
      if (!id) throw new Error('roleId required');
      return deleteRole(authFetch, id);
    },
    onSuccess: (_, roleIdArg) => {
      const id = roleIdArg ?? roleIdFromHook;
      queryClient.invalidateQueries({ queryKey: clientRbacKeys.roles(activeClientId) });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: clientRbacKeys.role(activeClientId, id),
        });
      }
      toast.success('Rôle supprimé.');
      if (roleIdFromHook) router.push('/client/roles');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Impossible de supprimer le rôle.');
    },
  });
}
