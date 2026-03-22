'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { updateProjectBudgetLink } from '../api/project-budget.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { UpdateProjectBudgetLinkPayload } from '../types/project.types';

export function useUpdateProjectBudgetLink(projectId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: async ({
      linkId,
      payload,
    }: {
      linkId: string;
      payload: UpdateProjectBudgetLinkPayload;
    }) => updateProjectBudgetLink(authFetch, linkId, payload),
    onSuccess: () => {
      if (clientId && projectId) {
        void queryClient.invalidateQueries({
          queryKey: projectQueryKeys.budgetLinks(clientId, projectId),
        });
      }
    },
  });
}
