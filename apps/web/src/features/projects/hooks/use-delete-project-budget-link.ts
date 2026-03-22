'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { deleteProjectBudgetLink } from '../api/project-budget.api';
import { projectQueryKeys } from '../lib/project-query-keys';

export function useDeleteProjectBudgetLink(projectId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async (linkId: string) => {
      return deleteProjectBudgetLink(authFetch, linkId);
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
