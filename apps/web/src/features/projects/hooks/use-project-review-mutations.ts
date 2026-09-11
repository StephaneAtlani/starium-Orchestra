'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  cancelProjectReview,
  closeConductProjectReview,
  completeProjectReviewAgendaItem,
  consolidateProjectReviewEscalations,
  consolidateProjectReviewDescents,
  createProjectReview,
  createProjectReviewAgendaItem,
  createProjectReviewAttachment,
  createProjectReviewEscalation,
  createProjectReviewParticipant,
  cancelProjectReviewEscalation,
  cancelProjectReviewDescent,
  deleteProjectReviewAgendaItem,
  deleteProjectReviewAttachment,
  deleteProjectReviewParticipant,
  finalizeProjectReview,
  getProjectReviewReportPreview,
  inviteProjectReview,
  lockProjectReviewAgenda,
  reopenProjectReview,
  reorderProjectReviewAgendaItems,
  scheduleProjectReview,
  sendProjectReviewReport,
  skipProjectReviewAgendaItem,
  startProjectReview,
  startProjectReviewAgendaItem,
  unlockProjectReviewAgenda,
  updateProjectReview,
  updateProjectReviewAgendaItem,
  updateProjectReviewAttachment,
  updateProjectReviewParticipant,
} from '../api/project-reviews.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { notificationsKeys } from '@/features/notifications/hooks/use-notifications';
import type {
  CreateProjectReviewEscalationPayload,
  InviteProjectReviewPayload,
} from '../types/project.types';

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
      queryKey: projectQueryKeys.reviewsSummary(clientId, projectId),
    });
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.review(clientId, projectId, reviewId),
    });
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.reviewEscalations(clientId, projectId, reviewId),
    });
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.reviewDescents(clientId, projectId, reviewId),
    });
  };

  const invalidate = () => {
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.reviews(clientId, projectId),
    });
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.reviewsSummary(clientId, projectId),
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
    mutationFn: ({
      reviewId,
      body,
    }: {
      reviewId: string;
      body?: { pushActionsToTasks?: boolean; promoteRiskNotes?: boolean };
    }) => finalizeProjectReview(authFetch, projectId, reviewId, body),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
    },
  });

  const closeConduct = useMutation({
    mutationFn: (reviewId: string) =>
      closeConductProjectReview(authFetch, projectId, reviewId),
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

  const deleteAgendaItem = useMutation({
    mutationFn: ({
      reviewId,
      agendaItemId,
    }: {
      reviewId: string;
      agendaItemId: string;
    }) =>
      deleteProjectReviewAgendaItem(
        authFetch,
        projectId,
        reviewId,
        agendaItemId,
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

  const lockAgenda = useMutation({
    mutationFn: (reviewId: string) =>
      lockProjectReviewAgenda(authFetch, projectId, reviewId),
    onSuccess: (_, reviewId) => {
      invalidateReview(reviewId);
    },
  });

  const unlockAgenda = useMutation({
    mutationFn: (reviewId: string) =>
      unlockProjectReviewAgenda(authFetch, projectId, reviewId),
    onSuccess: (_, reviewId) => {
      invalidateReview(reviewId);
    },
  });

  const createEscalation = useMutation({
    mutationFn: ({
      reviewId,
      body,
    }: {
      reviewId: string;
      body: CreateProjectReviewEscalationPayload;
    }) => createProjectReviewEscalation(authFetch, projectId, reviewId, body),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
      void qc.invalidateQueries({
        queryKey: projectQueryKeys.reviews(clientId, projectId),
      });
    },
  });

  const cancelEscalation = useMutation({
    mutationFn: ({
      reviewId,
      escalationId,
    }: {
      reviewId: string;
      escalationId: string;
    }) =>
      cancelProjectReviewEscalation(
        authFetch,
        projectId,
        reviewId,
        escalationId,
      ),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
      void qc.invalidateQueries({
        queryKey: projectQueryKeys.reviews(clientId, projectId),
      });
    },
  });

  const consolidateEscalations = useMutation({
    mutationFn: (reviewId: string) =>
      consolidateProjectReviewEscalations(authFetch, projectId, reviewId),
    onSuccess: (_, reviewId) => {
      invalidateReview(reviewId);
    },
  });

  const cancelDescent = useMutation({
    mutationFn: ({
      reviewId,
      descentId,
    }: {
      reviewId: string;
      descentId: string;
    }) =>
      cancelProjectReviewDescent(authFetch, projectId, reviewId, descentId),
    onSuccess: (_, { reviewId }) => {
      invalidateReview(reviewId);
      void qc.invalidateQueries({
        queryKey: projectQueryKeys.reviews(clientId, projectId),
      });
    },
  });

  const consolidateDescents = useMutation({
    mutationFn: (reviewId: string) =>
      consolidateProjectReviewDescents(authFetch, projectId, reviewId),
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
    closeConduct,
    cancel,
    reopen,
    inviteReview,
    createAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
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
    lockAgenda,
    unlockAgenda,
    createEscalation,
    cancelEscalation,
    consolidateEscalations,
    cancelDescent,
    consolidateDescents,
  };
}
