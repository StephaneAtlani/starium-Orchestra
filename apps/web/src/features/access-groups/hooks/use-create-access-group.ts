'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { accessGroupsKeys } from '../query-keys';
import {
  createAccessGroup,
  type CreateAccessGroupPayload,
} from '../api/access-groups';

export function useCreateAccessGroup() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (dto: CreateAccessGroupPayload) =>
      createAccessGroup(authFetch, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: accessGroupsKeys.list(activeClientId),
      });
      toast.success('Groupe créé.');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Impossible de créer le groupe.');
    },
  });
}
