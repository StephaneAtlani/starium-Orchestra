'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listWorkTeams } from '../api/work-teams.api';
import { workTeamQueryKeys } from '../lib/work-team-query-keys';
import type { WorkTeamsListParams } from '../types/work-team.types';

export function useWorkTeamsList(
  params: WorkTeamsListParams,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false && !!clientId;

  return useQuery({
    queryKey: workTeamQueryKeys.list(clientId, params),
    queryFn: () => listWorkTeams(authFetch, params),
    enabled,
  });
}
