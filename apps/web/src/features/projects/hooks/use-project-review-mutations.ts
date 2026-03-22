'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  cancelProjectReview,
  createProjectReview,
  finalizeProjectReview,
  updateProjectReview,
} from '../api/project-reviews.api';
import { projectQueryKeys } from '../lib/project-query-keys';

export function useProjectReviewMutations(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const qc = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const invalidate = () => {
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.reviews(clientId, projectId),
    });
  };

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      createProjectReview(authFetch, projectId, body),
    onSuccess: () => {
      invalidate();
    },
  });

  const update = useMutation({
    mutationFn: ({
      reviewId,
      body,
    }: {
      reviewId: string;
      body: Record<string, unknown>;
    }) => updateProjectReview(authFetch, projectId, reviewId, body),
    onSuccess: (_, { reviewId }) => {
      invalidate();
      void qc.invalidateQueries({
        queryKey: projectQueryKeys.review(clientId, projectId, reviewId),
      });
    },
  });

  const finalize = useMutation({
    mutationFn: (reviewId: string) =>
      finalizeProjectReview(authFetch, projectId, reviewId),
    onSuccess: (_, reviewId) => {
      invalidate();
      void qc.invalidateQueries({
        queryKey: projectQueryKeys.review(clientId, projectId, reviewId),
      });
    },
  });

  const cancel = useMutation({
    mutationFn: (reviewId: string) =>
      cancelProjectReview(authFetch, projectId, reviewId),
    onSuccess: (_, reviewId) => {
      invalidate();
      void qc.invalidateQueries({
        queryKey: projectQueryKeys.review(clientId, projectId, reviewId),
      });
    },
  });

  return { create, update, finalize, cancel };
}
