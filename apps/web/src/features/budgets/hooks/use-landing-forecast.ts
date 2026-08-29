'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import {
  applyLandingForecast,
  getLandingForecast,
  validateLandingForecast,
} from '../api/budget-landing-forecast.api';

export function useLandingForecast(budgetId: string | null, options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.landingForecast(clientId, budgetId ?? ''),
    queryFn: () => getLandingForecast(authFetch, budgetId!),
    enabled: !!clientId && !!budgetId && (options?.enabled ?? true),
  });
}

export function useValidateLandingForecast(budgetId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (arbitratedSnapshotId: string) =>
      validateLandingForecast(authFetch, budgetId, arbitratedSnapshotId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: budgetQueryKeys.landingForecast(clientId, budgetId),
      });
    },
  });
}

export function useApplyLandingForecast(budgetId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (arbitratedSnapshotId: string) =>
      applyLandingForecast(authFetch, budgetId, arbitratedSnapshotId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetQueryKeys.all(clientId) });
    },
  });
}
