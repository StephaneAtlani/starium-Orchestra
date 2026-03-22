'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import type { ApiFormError } from '@/features/budgets/api/types';
import {
  createProjectMilestone,
  createProjectTask,
  updateProjectMilestone,
  updateProjectTask,
  type CreateProjectMilestonePayload,
  type CreateProjectTaskPayload,
  type UpdateProjectMilestonePayload,
  type UpdateProjectTaskPayload,
} from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectMilestoneApi, ProjectTaskApi } from '../types/project.types';

function useInvalidateProjectPlanning(projectId: string) {
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return () => {
    if (!clientId) return;
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.tasks(clientId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.milestones(clientId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.gantt(clientId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.detail(clientId, projectId),
    });
  };
}

export function useCreateProjectTaskMutation(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useInvalidateProjectPlanning(projectId);

  return useMutation<ProjectTaskApi, ApiFormError, CreateProjectTaskPayload>({
    mutationFn: (body) => createProjectTask(authFetch, projectId, body),
    onSuccess: () => {
      invalidate();
      toast.success('Tâche créée.');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateProjectTaskMutation(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useInvalidateProjectPlanning(projectId);

  return useMutation<
    ProjectTaskApi,
    ApiFormError,
    { taskId: string; body: UpdateProjectTaskPayload; silentToast?: boolean }
  >({
    mutationFn: ({ taskId, body }) =>
      updateProjectTask(authFetch, projectId, taskId, body),
    onSuccess: (_data, variables) => {
      invalidate();
      if (!variables.silentToast) toast.success('Tâche mise à jour.');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useCreateProjectMilestoneMutation(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useInvalidateProjectPlanning(projectId);

  return useMutation<ProjectMilestoneApi, ApiFormError, CreateProjectMilestonePayload>({
    mutationFn: (body) => createProjectMilestone(authFetch, projectId, body),
    onSuccess: () => {
      invalidate();
      toast.success('Jalon créé.');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateProjectMilestoneMutation(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useInvalidateProjectPlanning(projectId);

  return useMutation<
    ProjectMilestoneApi,
    ApiFormError,
    { milestoneId: string; body: UpdateProjectMilestonePayload; silentToast?: boolean }
  >({
    mutationFn: ({ milestoneId, body }) =>
      updateProjectMilestone(authFetch, projectId, milestoneId, body),
    onSuccess: (_data, variables) => {
      invalidate();
      if (!variables.silentToast) toast.success('Jalon mis à jour.');
    },
    onError: (err) => toast.error(err.message),
  });
}
