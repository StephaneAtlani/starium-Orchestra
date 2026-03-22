'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getProjectReview } from '../api/project-reviews.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectReviewDetail } from '../types/project.types';

const STALE = 30_000;

export function useProjectReviewDetailQuery(projectId: string, reviewId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey:
      reviewId != null
        ? projectQueryKeys.review(clientId, projectId, reviewId)
        : ['project', 'review', 'idle'],
    queryFn: async () =>
      getProjectReview(authFetch, projectId, reviewId!) as Promise<ProjectReviewDetail>,
    enabled: !!clientId && !!projectId && !!reviewId,
    staleTime: STALE,
  });
}
