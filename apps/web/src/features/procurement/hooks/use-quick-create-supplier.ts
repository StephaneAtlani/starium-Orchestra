'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { quickCreateSupplier } from '../api/procurement.api';

export function useQuickCreateSupplier() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  return useMutation({
    mutationFn: async (payload: { name: string }) =>
      quickCreateSupplier(authFetch, payload),
    onMutate: () => {
      // Snapshot tenant id au moment de la mutation pour éviter un mismatch si le client actif change.
      const clientIdSnapshot = activeClient?.id ?? '';
      return { clientIdSnapshot };
    },
    onSuccess: (_data, _variables, context) => {
      const clientId = context?.clientIdSnapshot ?? '';
      if (!clientId) return;

      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === 'procurement' &&
            key[1] === clientId &&
            (key[2] === 'suppliers-dropdown' || key[2] === 'suppliers')
          );
        },
      });
    },
  });
}

