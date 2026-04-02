'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listWorkTeamMembers } from '../api/work-teams.api';
import { workTeamQueryKeys } from '../lib/work-team-query-keys';
import type { WorkTeamMembersParams } from '../types/work-team.types';

export function useWorkTeamMembers(teamId: string, params: WorkTeamMembersParams) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: workTeamQueryKeys.members(clientId, teamId, params),
    queryFn: () => listWorkTeamMembers(authFetch, teamId, params),
    enabled: !!clientId && !!teamId,
  });
}
