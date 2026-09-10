'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  createProjectReviewSeries,
  generateProjectReviewSeries,
  listProjectReviewSeries,
  updateProjectReviewSeries,
} from '../api/project-reviews.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const STALE = 30_000;

export function useProjectReviewSeriesQuery(
  projectId: string,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.reviewSeries(clientId, projectId),
    queryFn: async () => {
      const res = await listProjectReviewSeries(authFetch, projectId);
      return res.items;
    },
    enabled: (options?.enabled !== false) && !!clientId && !!projectId,
    staleTime: STALE,
  });
}

export function useProjectReviewSeriesMutations(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const qc = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const invalidate = () => {
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.reviewSeries(clientId, projectId),
    });
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.reviews(clientId, projectId),
    });
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.reviewsSummary(clientId, projectId),
    });
  };

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      createProjectReviewSeries(authFetch, projectId, body),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      seriesId,
      body,
    }: {
      seriesId: string;
      body: Record<string, unknown>;
    }) => updateProjectReviewSeries(authFetch, projectId, seriesId, body),
    onSuccess: invalidate,
  });

  const generate = useMutation({
    mutationFn: ({
      seriesId,
      count,
    }: {
      seriesId: string;
      count?: number;
    }) => generateProjectReviewSeries(authFetch, projectId, seriesId, { count }),
    onSuccess: invalidate,
  });

  return { create, update, generate };
}
