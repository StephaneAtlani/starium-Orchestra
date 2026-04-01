'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listCollaborators } from '../api/collaborators.api';
import { collaboratorQueryKeys } from '../lib/collaborator-query-keys';
import type { CollaboratorsListParams } from '../types/collaborator.types';

export function useCollaboratorsList(params: CollaboratorsListParams) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: collaboratorQueryKeys.list(clientId, params),
    queryFn: () => listCollaborators(authFetch, params),
    enabled: !!clientId,
  });
}

