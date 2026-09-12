'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectReviewPrepareTemplates } from '../api/project-reviews.api';
import { projectQueryKeys } from '../lib/project-query-keys';

export function usePrepareTemplatesQuery(
  projectId: string,
  typeCode: string,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient, initialized } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.prepareTemplates(clientId, projectId, typeCode),
    queryFn: () =>
      listProjectReviewPrepareTemplates(authFetch, projectId, typeCode),
    enabled:
      initialized &&
      (options?.enabled !== false) &&
      !!clientId &&
      !!projectId &&
      !!typeCode,
    staleTime: 30_000,
  });
}
