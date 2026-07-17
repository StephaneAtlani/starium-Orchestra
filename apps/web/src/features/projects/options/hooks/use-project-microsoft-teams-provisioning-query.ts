'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getProjectMicrosoftTeamsProvisioning } from '../api/project-microsoft-teams-provisioning';
import { projectOptionsKeys } from '../lib/project-options-query-keys';

const STALE = 10_000;

export function useProjectMicrosoftTeamsProvisioningQuery(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectOptionsKeys.microsoftProvisioning(clientId, projectId),
    queryFn: () => getProjectMicrosoftTeamsProvisioning(authFetch, projectId),
    enabled: Boolean(clientId && projectId),
    staleTime: STALE,
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.status === 'PENDING' || data.status === 'IN_PROGRESS' ? 15_000 : false;
    },
  });
}
