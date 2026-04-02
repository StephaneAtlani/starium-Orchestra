'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { previewManagerScope } from '../api/work-teams.api';
import { workTeamQueryKeys } from '../lib/work-team-query-keys';
import type { ManagerScopePreviewParams } from '../types/work-team.types';

export function useManagerScopePreview(
  managerCollaboratorId: string,
  params: ManagerScopePreviewParams,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: workTeamQueryKeys.managerScopePreview(clientId, managerCollaboratorId, params),
    queryFn: () => previewManagerScope(authFetch, managerCollaboratorId, params),
    enabled: !!clientId && !!managerCollaboratorId.trim(),
  });
}
