'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectReviewEscalations } from '../api/project-reviews.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectReviewEscalationsListResponse } from '../types/project.types';

const STALE = 15_000;

export function useProjectReviewEscalationsQuery(
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
        ? projectQueryKeys.reviewEscalations(clientId, projectId, reviewId)
        : ['project', 'review-escalations', 'idle'],
    queryFn: async () =>
      listProjectReviewEscalations(
        authFetch,
        projectId,
        reviewId!,
      ) as Promise<ProjectReviewEscalationsListResponse>,
    enabled: enabled && !!clientId && !!projectId && !!reviewId,
    staleTime: STALE,
  });
}
