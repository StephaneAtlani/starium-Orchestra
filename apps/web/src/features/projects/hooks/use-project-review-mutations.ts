'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  cancelProjectReview,
  completeProjectReviewAgendaItem,
  createProjectReview,
  createProjectReviewAgendaItem,
  createProjectReviewAttachment,
  createProjectReviewParticipant,
  deleteProjectReviewAttachment,
  deleteProjectReviewParticipant,
  finalizeProjectReview,
  getProjectReviewReportPreview,
  inviteProjectReview,
  reopenProjectReview,
  reorderProjectReviewAgendaItems,
  scheduleProjectReview,
  sendProjectReviewReport,
  skipProjectReviewAgendaItem,
  startProjectReview,
  startProjectReviewAgendaItem,
  updateProjectReview,
  updateProjectReviewAgendaItem,
  updateProjectReviewAttachment,
  updateProjectReviewParticipant,
} from '../api/project-reviews.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { notificationsKeys } from '@/features/notifications/hooks/use-notifications';
import type { InviteProjectReviewPayload } from '../types/project.types';

export function useProjectReviewMutations(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const qc = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const invalidateReview = (reviewId: string) => {
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.reviews(clientId, projectId),
    });
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.review(clientId, projectId, reviewId),
    });
  };

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
      invalidateReview(reviewId);
    },
  });

  const startReview = useMutation({
    mutationFn: (reviewId: string) =>
      startProjectReview(authFetch, projectId, reviewId),
    onSuccess: (_, reviewId) => {
      invalidateReview(reviewId);
    },
  });

  const scheduleReview = useMutation({
    mutationFn: ({
      reviewId,
      reviewDate,
    }: {
      reviewId: string;
      reviewDate: string;
    }) => scheduleProjectReview(authFetch, projectId, reviewId, { reviewDate }),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const finalize = useMutation({
    mutationFn: (reviewId: string) =>
      finalizeProjectReview(authFetch, projectId, reviewId),
    onSuccess: (_, reviewId) => {
      invalidateReview(reviewId);
    },
  });

  const cancel = useMutation({
    mutationFn: (reviewId: string) =>
      cancelProjectReview(authFetch, projectId, reviewId),
    onSuccess: (_, reviewId) => {
      invalidateReview(reviewId);
    },
  });

  const reopen = useMutation({
    mutationFn: (reviewId: string) =>
      reopenProjectReview(authFetch, projectId, reviewId),
    onSuccess: (_, reviewId) => {
      invalidateReview(reviewId);
    },
  });

  const createAgendaItem = useMutation({
    mutationFn: ({
      reviewId,
      body,
    }: {
      reviewId: string;
      body: Record<string, unknown>;
    }) => createProjectReviewAgendaItem(authFetch, projectId, reviewId, body),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const updateAgendaItem = useMutation({
    mutationFn: ({
      reviewId,
      agendaItemId,
      body,
    }: {
      reviewId: string;
      agendaItemId: string;
      body: Record<string, unknown>;
    }) =>
      updateProjectReviewAgendaItem(
        authFetch,
        projectId,
        reviewId,
        agendaItemId,
        body,
      ),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const reorderAgendaItems = useMutation({
    mutationFn: ({
      reviewId,
      items,
    }: {
      reviewId: string;
      items: Array<{ id: string; orderIndex: number }>;
    }) => reorderProjectReviewAgendaItems(authFetch, projectId, reviewId, items),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const startAgendaItem = useMutation({
    mutationFn: ({
      reviewId,
      agendaItemId,
    }: {
      reviewId: string;
      agendaItemId: string;
    }) =>
      startProjectReviewAgendaItem(authFetch, projectId, reviewId, agendaItemId),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const completeAgendaItem = useMutation({
    mutationFn: ({
      reviewId,
      agendaItemId,
    }: {
      reviewId: string;
      agendaItemId: string;
    }) =>
      completeProjectReviewAgendaItem(
        authFetch,
        projectId,
        reviewId,
        agendaItemId,
      ),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const skipAgendaItem = useMutation({
    mutationFn: ({
      reviewId,
      agendaItemId,
    }: {
      reviewId: string;
      agendaItemId: string;
    }) =>
      skipProjectReviewAgendaItem(authFetch, projectId, reviewId, agendaItemId),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const createParticipant = useMutation({
    mutationFn: ({
      reviewId,
      body,
    }: {
      reviewId: string;
      body: Record<string, unknown>;
    }) => createProjectReviewParticipant(authFetch, projectId, reviewId, body),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const updateParticipant = useMutation({
    mutationFn: ({
      reviewId,
      participantId,
      body,
    }: {
      reviewId: string;
      participantId: string;
      body: Record<string, unknown>;
    }) =>
      updateProjectReviewParticipant(
        authFetch,
        projectId,
        reviewId,
        participantId,
        body,
      ),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const deleteParticipant = useMutation({
    mutationFn: ({
      reviewId,
      participantId,
    }: {
      reviewId: string;
      participantId: string;
    }) =>
      deleteProjectReviewParticipant(
        authFetch,
        projectId,
        reviewId,
        participantId,
      ),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const inviteReview = useMutation({
    mutationFn: ({
      reviewId,
      body,
    }: {
      reviewId: string;
      body?: InviteProjectReviewPayload;
    }) => inviteProjectReview(authFetch, projectId, reviewId, body),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
      void qc.invalidateQueries({
        queryKey: notificationsKeys.root(clientId),
      });
    },
  });

  const createAttachment = useMutation({
    mutationFn: ({
      reviewId,
      body,
    }: {
      reviewId: string;
      body: Record<string, unknown>;
    }) => createProjectReviewAttachment(authFetch, projectId, reviewId, body),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const updateAttachment = useMutation({
    mutationFn: ({
      reviewId,
      attachmentId,
      body,
    }: {
      reviewId: string;
      attachmentId: string;
      body: Record<string, unknown>;
    }) =>
      updateProjectReviewAttachment(
        authFetch,
        projectId,
        reviewId,
        attachmentId,
        body,
      ),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const deleteAttachment = useMutation({
    mutationFn: ({
      reviewId,
      attachmentId,
    }: {
      reviewId: string;
      attachmentId: string;
    }) =>
      deleteProjectReviewAttachment(authFetch, projectId, reviewId, attachmentId),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const reportPreview = useMutation({
    mutationFn: (reviewId: string) =>
      getProjectReviewReportPreview(authFetch, projectId, reviewId),
  });

  const sendReport = useMutation({
    mutationFn: (reviewId: string) =>
      sendProjectReviewReport(authFetch, projectId, reviewId),
    onSuccess: (_, reviewId) => {
      invalidateReview(reviewId);
    },
  });

  return {
    create,
    update,
    scheduleReview,
    startReview,
    finalize,
    cancel,
    reopen,
    inviteReview,
    createAgendaItem,
    updateAgendaItem,
    reorderAgendaItems,
    startAgendaItem,
    completeAgendaItem,
    skipAgendaItem,
    createParticipant,
    updateParticipant,
    deleteParticipant,
    createAttachment,
    updateAttachment,
    deleteAttachment,
    reportPreview,
    sendReport,
  };
}
