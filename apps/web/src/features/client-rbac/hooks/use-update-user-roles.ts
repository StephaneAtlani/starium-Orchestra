'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '../query-keys';
import { updateUserRoles } from '../api/user-roles';
import type { ReplaceUserRolesDto } from '../types';

export function useUpdateUserRoles(userId: string | undefined) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (dto: ReplaceUserRolesDto) =>
      updateUserRoles(authFetch, userId!, dto),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: clientRbacKeys.userRoles(activeClientId, userId),
        });
      }
      queryClient.invalidateQueries({ queryKey: clientRbacKeys.members(activeClientId) });
      toast.success('Rôles mis à jour.');
    },
  });
}
