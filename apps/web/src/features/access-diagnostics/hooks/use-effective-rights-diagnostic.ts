'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  getClientEffectiveRights,
  getPlatformEffectiveRights,
  type EffectiveRightsQuery,
  type EffectiveRightsResponse,
} from '../api/access-diagnostics';

export function useClientEffectiveRightsDiagnostic() {
  const authFetch = useAuthenticatedFetch();
  return useMutation<EffectiveRightsResponse, Error, EffectiveRightsQuery>({
    mutationFn: (query) => getClientEffectiveRights(authFetch, query),
  });
}

export function usePlatformEffectiveRightsDiagnostic(clientId: string) {
  const authFetch = useAuthenticatedFetch();
  return useMutation<EffectiveRightsResponse, Error, EffectiveRightsQuery>({
    mutationFn: (query) => getPlatformEffectiveRights(authFetch, clientId, query),
  });
}
