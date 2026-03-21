'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { createProjectBudgetLink } from '../api/project-budget.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { CreateProjectBudgetLinkPayload } from '../types/project.types';

export function useCreateProjectBudgetLink(projectId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (payload: CreateProjectBudgetLinkPayload) => {
      if (!projectId) throw new Error('projectId requis');
      return createProjectBudgetLink(authFetch, projectId, payload);
    },
    onSuccess: () => {
      if (clientId && projectId) {
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.budgetLinks(clientId, projectId),
        });
      }
    },
  });
}
