'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getCollaboratorById } from '../api/collaborators.api';
import { collaboratorQueryKeys } from '../lib/collaborator-query-keys';

export function useCollaboratorDetail(collaboratorId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: collaboratorQueryKeys.detail(clientId, collaboratorId),
    queryFn: () => getCollaboratorById(authFetch, collaboratorId),
    enabled: !!clientId && !!collaboratorId,
  });
}

