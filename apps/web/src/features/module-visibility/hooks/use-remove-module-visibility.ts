'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { PERMISSIONS_QUERY_KEY } from '@/hooks/use-permissions';
import { moduleVisibilityKeys } from '../query-keys';
import {
  removeModuleVisibility,
  type ModuleVisibilityScopeType,
} from '../api/module-visibility';

export function useRemoveModuleVisibility() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const activeClientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (params: {
      moduleCode: string;
      scopeType: ModuleVisibilityScopeType;
      scopeId?: string;
    }) => removeModuleVisibility(authFetch, params),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: moduleVisibilityKeys.matrix(activeClientId),
      });
      void queryClient.invalidateQueries({
        queryKey: [...PERMISSIONS_QUERY_KEY, activeClientId],
      });
      toast.success('Règle supprimée.');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Impossible de supprimer.');
    },
  });
}
