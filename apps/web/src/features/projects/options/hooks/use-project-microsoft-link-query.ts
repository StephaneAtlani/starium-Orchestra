'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getProjectMicrosoftLink } from '../api/get-project-microsoft-link';
import { projectOptionsKeys } from '../lib/project-options-query-keys';

const STALE = 30_000;

export function useProjectMicrosoftLinkQuery(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectOptionsKeys.microsoftLink(clientId, projectId),
    queryFn: () => getProjectMicrosoftLink(authFetch, projectId),
    enabled: Boolean(clientId && projectId),
    staleTime: STALE,
    retry: false,
  });
}
