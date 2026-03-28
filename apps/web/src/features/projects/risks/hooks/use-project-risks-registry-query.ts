'use client';

/**
 * MVP : agrégation client (GET projets paginé + GET risques par projet).
 * Si volumétrie ou perf insuffisante : endpoint agrégé serveur (filtres + pagination + enrichissement).
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listAssignableUsers, listRisks } from '../../api/projects.api';
import { projectQueryKeys } from '../../lib/project-query-keys';
import type { ProjectListItem, ProjectRiskApi } from '../../types/project.types';
import { fetchAllProjectsForRegistry } from '../lib/fetch-projects-registry-meta';
import { buildOwnerIdToDisplayMap } from '../lib/owner-display';
import { poolMap } from '../lib/promise-pool';
import { sortRisksRegistryDefault } from '../lib/risks-registry-sort';

/** Concurrence max appels `listRisks` simultanés (borne MVP ~100 projets). */
const RISKS_FETCH_CONCURRENCY = 6;

export type ProjectRiskRegistryRow = ProjectRiskApi & {
  projectName: string;
  ownerDisplayLabel: string;
};

export type ProjectRisksRegistryData = {
  rows: ProjectRiskRegistryRow[];
  projectItems: ProjectListItem[];
};

async function aggregateRisksForProjects(
  authFetch: Parameters<typeof listRisks>[0],
  projectItems: ProjectListItem[],
): Promise<ProjectRisksRegistryData> {
  const projectMap = new Map(projectItems.map((p) => [p.id, p.name]));
  const { users } = await listAssignableUsers(authFetch);
  const ownerMap = buildOwnerIdToDisplayMap(users);

  const projectIds = projectItems.map((p) => p.id);
  const riskLists = await poolMap(projectIds, RISKS_FETCH_CONCURRENCY, (projectId) =>
    listRisks(authFetch, projectId),
  );
  const risks = riskLists.flat();

  const rows: ProjectRiskRegistryRow[] = risks.map((r) => {
    const projectName = projectMap.get(r.projectId) ?? 'Initiative inconnue';
    const ownerDisplayLabel = !r.ownerUserId
      ? 'Non assigné'
      : ownerMap.get(r.ownerUserId) ?? 'Utilisateur inconnu';

    return { ...r, projectName, ownerDisplayLabel };
  });

  return {
    rows: sortRisksRegistryDefault(rows),
    projectItems,
  };
}

export function useProjectRisksRegistryQuery() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient, initialized } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const projectsQuery = useQuery({
    queryKey: projectQueryKeys.risksRegistryProjects(clientId),
    queryFn: () => fetchAllProjectsForRegistry(authFetch),
    enabled: initialized && !!clientId,
    staleTime: 30_000,
  });

  const aggregateQuery = useQuery({
    queryKey: [
      ...projectQueryKeys.risksRegistry(clientId),
      projectsQuery.data?.map((p) => p.id).join('|') ?? '',
    ],
    queryFn: () => aggregateRisksForProjects(authFetch, projectsQuery.data!),
    enabled: projectsQuery.isSuccess && !!clientId,
    staleTime: 30_000,
  });

  const phase: 'idle' | 'projects' | 'risks' | 'done' | 'error' = (() => {
    if (projectsQuery.isError || aggregateQuery.isError) return 'error';
    if (projectsQuery.isLoading) return 'projects';
    if (aggregateQuery.isLoading) return 'risks';
    if (aggregateQuery.isSuccess) return 'done';
    return 'idle';
  })();

  return {
    clientId,
    phase,
    projectItems: projectsQuery.data,
    data: aggregateQuery.data,
    /** Lignes triées par défaut ; filtrage / pagination UI en aval. */
    rows: aggregateQuery.data?.rows ?? [],
    error: projectsQuery.error ?? aggregateQuery.error,
    isLoadingProjects: projectsQuery.isLoading,
    isLoadingRisks: aggregateQuery.isLoading && projectsQuery.isSuccess,
    isError: projectsQuery.isError || aggregateQuery.isError,
    isSuccess: aggregateQuery.isSuccess,
    refetch: async () => {
      await projectsQuery.refetch();
      await aggregateQuery.refetch();
    },
  };
}
