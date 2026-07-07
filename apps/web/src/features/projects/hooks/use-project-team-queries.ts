'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  getProjectTeam,
  getProjectTeamRaci,
  listProjectTeamRoles,
} from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { normalizeProjectRaciMatrix } from '../lib/normalize-project-raci-matrix';

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

export function useProjectTeamQuery(
  projectId: string,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.team(clientId, projectId),
    queryFn: () => getProjectTeam(authFetch, projectId),
    enabled: (options?.enabled !== false) && !!clientId && !!projectId,
    staleTime: STALE,
  });
}

export function useProjectTeamRaciQuery(
  projectId: string,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.raciMatrix(clientId, projectId),
    queryFn: () => getProjectTeamRaci(authFetch, projectId),
    select: normalizeProjectRaciMatrix,
    enabled: (options?.enabled !== false) && !!clientId && !!projectId,
    staleTime: STALE,
  });
}
