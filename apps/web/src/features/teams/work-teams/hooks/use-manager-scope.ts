'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getManagerScope } from '../api/work-teams.api';
import { workTeamQueryKeys } from '../lib/work-team-query-keys';

export function useManagerScope(managerCollaboratorId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: workTeamQueryKeys.managerScope(clientId, managerCollaboratorId),
    queryFn: () => getManagerScope(authFetch, managerCollaboratorId),
    enabled: !!clientId && !!managerCollaboratorId.trim(),
  });
}
