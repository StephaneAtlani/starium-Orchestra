'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getWorkTeamsTree } from '../api/work-teams.api';
import { workTeamQueryKeys } from '../lib/work-team-query-keys';
import type { WorkTeamsTreeParams } from '../types/work-team.types';

export function useWorkTeamsTree(
  params: WorkTeamsTreeParams,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false && !!clientId;

  return useQuery({
    queryKey: workTeamQueryKeys.tree(clientId, params),
    queryFn: () => getWorkTeamsTree(authFetch, params),
    enabled,
  });
}
