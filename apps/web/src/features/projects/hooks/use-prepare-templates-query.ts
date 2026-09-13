'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectReviewPrepareTemplates } from '../api/project-reviews.api';
import { projectQueryKeys } from '../lib/project-query-keys';

export function usePrepareTemplatesQuery(
  projectId: string,
  typeCode?: string | null,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient, initialized } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const code = typeCode?.trim() || '';

  return useQuery({
    queryKey: projectQueryKeys.prepareTemplates(
      clientId,
      projectId,
      code || '__all__',
    ),
    queryFn: () =>
      listProjectReviewPrepareTemplates(
        authFetch,
        projectId,
        code || undefined,
      ),
    enabled:
      initialized &&
      options?.enabled !== false &&
      !!clientId &&
      !!projectId,
    staleTime: 30_000,
  });
}
