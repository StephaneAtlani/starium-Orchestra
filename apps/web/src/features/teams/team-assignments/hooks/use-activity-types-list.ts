'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listActivityTypes } from '../api/activity-types.api';
import type { ActivityTypesListParams } from '../types/activity-type.types';

export const activityTypesQueryKey = (
  clientId: string,
  params: ActivityTypesListParams,
) => ['teams', 'activity-types', 'list', clientId, params] as const;

export function useActivityTypesList(
  params: ActivityTypesListParams,
  enabled: boolean,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: activityTypesQueryKey(clientId, params),
    queryFn: () => listActivityTypes(authFetch, params),
    enabled: !!clientId && enabled,
  });
}
