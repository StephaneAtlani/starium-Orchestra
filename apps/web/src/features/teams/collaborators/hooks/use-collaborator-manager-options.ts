'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listCollaboratorManagerOptions } from '../api/collaborators.api';
import { collaboratorQueryKeys } from '../lib/collaborator-query-keys';

export function useCollaboratorManagerOptions(search: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const params = { search: search.trim(), offset: 0, limit: 30 };

  return useQuery({
    queryKey: collaboratorQueryKeys.managerOptions(clientId, params),
    queryFn: () => listCollaboratorManagerOptions(authFetch, params),
    enabled: !!clientId,
  });
}

