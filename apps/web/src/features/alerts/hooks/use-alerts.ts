'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { dismissAlert, listAlerts, resolveAlert } from '@/services/alerts';

export const alertsKeys = {
  root: (clientId: string) => ['alerts', clientId] as const,
};

export function useCriticalAlertsQuery() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  return useQuery({
    queryKey: alertsKeys.root(clientId),
    queryFn: () =>
      listAlerts(authFetch, {
        severity: 'CRITICAL',
        status: 'ACTIVE',
        limit: 10,
        offset: 0,
      }),
    enabled: Boolean(clientId),
  });
}

export function useResolveAlertMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resolveAlert(authFetch, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: alertsKeys.root(clientId) });
    },
  });
}

export function useDismissAlertMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dismissAlert(authFetch, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: alertsKeys.root(clientId) });
    },
  });
}
