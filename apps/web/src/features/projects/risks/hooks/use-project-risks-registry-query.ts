'use client';

/**
 * Registre client : `GET /api/risks` + méta-projets pour filtres (libellés).
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listAssignableUsers, listClientRisks } from '../../api/projects.api';
import { projectQueryKeys } from '../../lib/project-query-keys';
import type { ProjectListItem, ProjectRiskApi } from '../../types/project.types';
import { fetchAllProjectsForRegistry } from '../lib/fetch-projects-registry-meta';
import { buildOwnerIdToDisplayMap } from '../lib/owner-display';
import { sortRisksRegistryDefault } from '../lib/risks-registry-sort';

export type ProjectRiskRegistryRow = ProjectRiskApi & {
  projectName: string;
  ownerDisplayLabel: string;
};

export type ProjectRisksRegistryData = {
  rows: ProjectRiskRegistryRow[];
  projectItems: ProjectListItem[];
};

function projectDisplayName(
  r: ProjectRiskApi,
  projectMap: Map<string, string>,
): string {
  if (r.projectId == null) return 'Hors projet';
  return r.project?.name ?? projectMap.get(r.projectId) ?? 'Projet inconnu';
}

async function buildRegistryData(
  authFetch: Parameters<typeof listClientRisks>[0],
  projectItems: ProjectListItem[],
): Promise<ProjectRisksRegistryData> {
  const projectMap = new Map(projectItems.map((p) => [p.id, p.name]));
  const { users } = await listAssignableUsers(authFetch);
  const ownerMap = buildOwnerIdToDisplayMap(users);

  const risks = await listClientRisks(authFetch);

  const rows: ProjectRiskRegistryRow[] = risks.map((r) => {
    const projectName = projectDisplayName(r, projectMap);
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
      projectQueryKeys.clientRisks(clientId),
      projectsQuery.data?.map((p) => p.id).join('|') ?? '',
    ],
    queryFn: () => buildRegistryData(authFetch, projectsQuery.data!),
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
