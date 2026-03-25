'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectDocuments } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectDocumentApi } from '../types/project.types';

const STALE = 30_000;

export function useProjectDocumentsQuery(
  projectId: string,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: projectQueryKeys.documents(clientId, projectId),
    queryFn: async () =>
      (await listProjectDocuments(authFetch, projectId)) as ProjectDocumentApi[],
    enabled: (options?.enabled !== false) && !!clientId && !!projectId,
    staleTime: STALE,
  });
}

