'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectReviewDescents } from '../api/project-reviews.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectReviewDescentsListResponse } from '../types/project.types';

const STALE = 15_000;

export function useProjectReviewDescentsQuery(
  projectId: string,
  reviewId: string | null,
  enabled = true,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey:
      reviewId != null
        ? projectQueryKeys.reviewDescents(clientId, projectId, reviewId)
        : ['project', 'review-descents', 'idle'],
    queryFn: async () =>
      listProjectReviewDescents(
        authFetch,
        projectId,
        reviewId!,
      ) as Promise<ProjectReviewDescentsListResponse>,
    enabled: enabled && !!clientId && !!projectId && !!reviewId,
    staleTime: STALE,
  });
}
