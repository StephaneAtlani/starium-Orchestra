'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '../query-keys';
import { updateRole } from '../api/roles';
import type { UpdateRoleDto } from '../types';

export function useUpdateRole(roleId: string | undefined) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (dto: UpdateRoleDto) =>
      updateRole(authFetch, roleId!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientRbacKeys.roles(activeClientId) });
      if (roleId) {
        queryClient.invalidateQueries({
          queryKey: clientRbacKeys.role(activeClientId, roleId),
        });
      }
      toast.success('Rôle mis à jour.');
    },
  });
}
