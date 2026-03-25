'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from 'sonner';
import { updateProjectOptions } from '../api/update-project-options';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';

export function useUpdateProjectOptionsMutation(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      updateProjectOptions(authFetch, projectId, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: projectQueryKeys.detail(clientId, projectId) });
      toast.success('Projet mis à jour.');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Enregistrement impossible.');
    },
  });
}
