'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { collaboratorQueryKeys } from '../lib/collaborator-query-keys';
import { updateCollaborator } from '../api/collaborators.api';
import type { CollaboratorUpdatePayload } from '../types/collaborator.types';

export function useUpdateCollaborator(collaboratorId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CollaboratorUpdatePayload) =>
      updateCollaborator(authFetch, collaboratorId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: collaboratorQueryKeys.detail(clientId, collaboratorId),
      });
      void queryClient.invalidateQueries({
        queryKey: [...collaboratorQueryKeys.all, 'list', clientId],
      });
    },
  });
}

