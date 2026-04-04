'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '../query-keys';
import { createRole } from '../api/roles';
import type { CreateRoleDto } from '../types';

export function useCreateRole() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (dto: CreateRoleDto) => createRole(authFetch, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clientRbacKeys.roles(activeClientId) });
      toast.success('Rôle créé.');
      router.push(`/client/roles/${data.id}`);
    },
  });
}
