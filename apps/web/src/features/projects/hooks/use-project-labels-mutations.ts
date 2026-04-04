'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import type { ApiFormError } from '@/features/budgets/api/types';
import {
  createProjectMilestoneLabel,
  type CreateProjectMilestoneLabelPayload,
} from '../api/project-milestone-labels.api';
import {
  createProjectTaskLabel,
  type CreateProjectTaskLabelPayload,
} from '../api/project-task-labels.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type {
  ProjectMilestoneLabelApi,
  ProjectTaskLabelApi,
} from '../types/project.types';

function useTaskLabelInvalidate(projectId: string) {
  const qc = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return () => {
    if (!clientId) return;
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.taskLabels(clientId, projectId),
    });
  };
}

function useMilestoneLabelInvalidate(projectId: string) {
  const qc = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return () => {
    if (!clientId) return;
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.milestoneLabels(clientId, projectId),
    });
  };
}

export function useCreateProjectTaskLabelMutation(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useTaskLabelInvalidate(projectId);

  return useMutation<ProjectTaskLabelApi, ApiFormError, CreateProjectTaskLabelPayload>({
    mutationFn: (body) => createProjectTaskLabel(authFetch, projectId, body),
    onSuccess: () => {
      invalidate();
      toast.success('Étiquette ajoutée.');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useCreateProjectMilestoneLabelMutation(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useMilestoneLabelInvalidate(projectId);

  return useMutation<
    ProjectMilestoneLabelApi,
    ApiFormError,
    CreateProjectMilestoneLabelPayload
  >({
    mutationFn: (body) => createProjectMilestoneLabel(authFetch, projectId, body),
    onSuccess: () => {
      invalidate();
      toast.success('Étiquette ajoutée.');
    },
    onError: (err) => toast.error(err.message),
  });
}

