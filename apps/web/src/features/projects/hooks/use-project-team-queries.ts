'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  getProjectTeam,
  listProjectTeamRoles,
} from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const STALE = 30_000;

export function useProjectTeamRolesQuery() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.teamRoles(clientId),
    queryFn: () => listProjectTeamRoles(authFetch),
    enabled: !!clientId,
    staleTime: STALE,
  });
}

export function useProjectTeamQuery(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.team(clientId, projectId),
    queryFn: () => getProjectTeam(authFetch, projectId),
    enabled: !!clientId && !!projectId,
    staleTime: STALE,
  });
}
