'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getProjectReviewsSummary } from '../api/project-reviews.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const STALE = 30_000;

export function useProjectReviewsSummaryQuery(
  projectId: string,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.reviewsSummary(clientId, projectId),
    queryFn: () => getProjectReviewsSummary(authFetch, projectId),
    enabled: (options?.enabled !== false) && !!clientId && !!projectId,
    staleTime: STALE,
  });
}
