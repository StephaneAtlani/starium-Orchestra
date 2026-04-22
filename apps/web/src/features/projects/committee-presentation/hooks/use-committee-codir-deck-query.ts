'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjects } from '../../api/projects.api';
import { projectQueryKeys } from '../../lib/project-query-keys';
import type { ProjectListItem } from '../../types/project.types';

const PAGE_LIMIT = 100;
const STALE = 30_000;

async function fetchAllProjectsForDeck(
  authFetch: ReturnType<typeof useAuthenticatedFetch>,
): Promise<ProjectListItem[]> {
  const all: ProjectListItem[] = [];
  let page = 1;
  const maxPages = 200;

  for (;;) {
    const res = await listProjects(authFetch, {
      page,
      limit: PAGE_LIMIT,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    all.push(...res.items);
    if (res.items.length === 0 || all.length >= res.total) break;
    page += 1;
    if (page > maxPages) break;
  }

  return all;
}

/** Liste paginée complète du portefeuille pour le mode présentation CODIR. */
export function useCommitteeCodirDeckQuery(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const allow = options?.enabled !== false;

  return useQuery({
    queryKey: projectQueryKeys.committeeCodirDeck(clientId),
    queryFn: () => fetchAllProjectsForDeck(authFetch),
    enabled: !!clientId && allow,
    staleTime: STALE,
  });
}
