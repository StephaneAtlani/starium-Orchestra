'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectResourceAssignments } from '../api/team-assignments.api';
import { teamAssignmentQueryKeys } from '../lib/team-assignment-query-keys';
import type { ProjectResourceAssignmentsListParams } from '../types/team-assignment.types';

export function useProjectResourceAssignments(
  projectId: string,
  params: ProjectResourceAssignmentsListParams,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: teamAssignmentQueryKeys.projectList(clientId, projectId, params),
    queryFn: () => listProjectResourceAssignments(authFetch, projectId, params),
    enabled: !!clientId && !!projectId,
  });
}
