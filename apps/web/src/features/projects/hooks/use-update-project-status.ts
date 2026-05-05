'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import type { ApiFormError } from '@/features/budgets/api/types';
import { updateProject } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectsListResponse } from '../types/project.types';

type UpdateProjectStatusVariables = {
  projectId: string;
  targetStatus: string;
};

type MutationContext = {
  previousList?: ProjectsListResponse;
};

export function useUpdateProjectStatus(apiParams: Record<string, string | number | boolean | undefined>) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  const listKey = projectQueryKeys.list(clientId, apiParams);
  const summaryKey = projectQueryKeys.summary(clientId);

  return useMutation<unknown, ApiFormError, UpdateProjectStatusVariables, MutationContext>({
    mutationFn: async ({ projectId, targetStatus }) =>
      updateProject(authFetch, projectId, { status: targetStatus }),
    onMutate: async ({ projectId, targetStatus }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData<ProjectsListResponse>(listKey);

      if (previousList) {
        queryClient.setQueryData<ProjectsListResponse>(listKey, {
          ...previousList,
          items: previousList.items.map((item) =>
            item.id === projectId ? { ...item, status: targetStatus } : item,
          ),
        });
      }

      return { previousList };
    },
    onError: (error, _variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(listKey, context.previousList);
      }
      if (error?.status === 403) {
        toast.error("Action refusée: vous n'avez pas la permission de modifier le statut.");
        return;
      }
      toast.error(error?.message ?? 'Impossible de mettre a jour le statut du projet.');
    },
    onSuccess: () => {
      toast.success('Statut du projet mis a jour.');
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listKey }),
        queryClient.invalidateQueries({ queryKey: summaryKey }),
      ]);
    },
  });
}
