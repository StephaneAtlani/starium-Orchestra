'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listTeamResourceAssignments } from '../api/team-assignments.api';
import { teamAssignmentQueryKeys } from '../lib/team-assignment-query-keys';
import type { TeamResourceAssignmentsListParams } from '../types/team-assignment.types';

export function useTeamAssignmentsList(params: TeamResourceAssignmentsListParams) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: teamAssignmentQueryKeys.list(clientId, params),
    queryFn: () => listTeamResourceAssignments(authFetch, params),
    enabled: !!clientId,
  });
}
