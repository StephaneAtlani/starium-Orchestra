'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectReviews } from '../api/project-reviews.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectReviewListItem } from '../types/project.types';

const STALE = 30_000;

export function useProjectReviewsQuery(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.reviews(clientId, projectId),
    queryFn: async () => {
      const res = await listProjectReviews(authFetch, projectId);
      return res.items as ProjectReviewListItem[];
    },
    enabled: !!clientId && !!projectId,
    staleTime: STALE,
  });
}
