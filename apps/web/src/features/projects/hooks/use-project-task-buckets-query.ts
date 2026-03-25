'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectTaskBuckets } from '../api/project-task-buckets.api';
import { projectQueryKeys } from '../lib/project-query-keys';

export function useProjectTaskBucketsQuery(projectId: string, enabled = true) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.taskBuckets(clientId, projectId),
    queryFn: () => listProjectTaskBuckets(authFetch, projectId),
    enabled: Boolean(clientId && projectId && enabled),
  });
}
