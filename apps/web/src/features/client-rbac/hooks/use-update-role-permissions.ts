'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '../query-keys';
import { updateRolePermissions } from '../api/roles';
import type { ReplaceRolePermissionsDto } from '../types';

export function useUpdateRolePermissions(roleId: string | undefined) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (dto: ReplaceRolePermissionsDto) =>
      updateRolePermissions(authFetch, roleId!, dto),
    onSuccess: () => {
      if (roleId) {
        queryClient.invalidateQueries({
          queryKey: clientRbacKeys.role(activeClientId, roleId),
        });
      }
      queryClient.invalidateQueries({ queryKey: clientRbacKeys.roles(activeClientId) });
      toast.success('Permissions mises à jour.');
    },
  });
}
