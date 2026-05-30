'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  getGovernanceCycle,
  getGovernanceCycleSummary,
  getGovernanceCyclesByProject,
  listGovernanceCycleItems,
  listGovernanceCycles,
} from './governance-cycles.api';
import { governanceCyclesKeys } from '../lib/governance-cycles-query-keys';
import type {
  ListGovernanceCycleItemsParams,
  ListGovernanceCyclesParams,
} from '../types/governance-cycle.types';

function useGovernanceCyclesReadContext(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const { has, isSuccess: permsSuccess } = usePermissions();
  const clientId = activeClient?.id ?? '';
  const canRead = has('governance_cycles.read');
  const readEnabled =
    Boolean(clientId) &&
    permsSuccess &&
    canRead &&
    (options?.enabled !== false);

  return { authFetch, clientId, readEnabled, canRead, permsSuccess };
}

export function useGovernanceCyclesListQuery(
  params: ListGovernanceCyclesParams,
  options?: { enabled?: boolean },
) {
  const { authFetch, clientId, readEnabled } = useGovernanceCyclesReadContext(options);

  return useQuery({
    queryKey: governanceCyclesKeys.list(clientId, params),
    queryFn: () => listGovernanceCycles(authFetch, params),
    enabled: readEnabled,
    placeholderData: (prev) => prev,
  });
}

export function useGovernanceCycleDetailQuery(
  cycleId: string,
  options?: { enabled?: boolean },
) {
  const { authFetch, clientId, readEnabled } = useGovernanceCyclesReadContext(options);

  return useQuery({
    queryKey: governanceCyclesKeys.detail(clientId, cycleId),
    queryFn: () => getGovernanceCycle(authFetch, cycleId),
    enabled: readEnabled && Boolean(cycleId),
  });
}

export function useGovernanceCycleSummaryQuery(
  cycleId: string,
  options?: { enabled?: boolean },
) {
  const { authFetch, clientId, readEnabled } = useGovernanceCyclesReadContext(options);

  return useQuery({
    queryKey: governanceCyclesKeys.summary(clientId, cycleId),
    queryFn: () => getGovernanceCycleSummary(authFetch, cycleId),
    enabled: readEnabled && Boolean(cycleId),
  });
}

export function useGovernanceCyclesByProjectQuery(
  projectId: string,
  options?: { enabled?: boolean },
) {
  const { authFetch, clientId, readEnabled } = useGovernanceCyclesReadContext(options);
  const enabled =
    readEnabled && Boolean(projectId) && (options?.enabled !== false);

  return useQuery({
    queryKey: governanceCyclesKeys.byProject(clientId, projectId),
    queryFn: () => getGovernanceCyclesByProject(authFetch, projectId),
    enabled,
  });
}

export function useGovernanceCycleItemsQuery(
  cycleId: string,
  params?: ListGovernanceCycleItemsParams,
  options?: { enabled?: boolean },
) {
  const { authFetch, clientId, readEnabled } = useGovernanceCyclesReadContext(options);
  const filters = params ?? {};

  return useQuery({
    queryKey: governanceCyclesKeys.items(clientId, cycleId, filters),
    queryFn: () => listGovernanceCycleItems(authFetch, cycleId, filters),
    enabled: readEnabled && Boolean(cycleId),
    placeholderData: (prev) => prev,
  });
}

/** Summary par cycle visible — échec isolé, ne bloque pas la liste. */
export function useGovernanceCycleSummariesForIdsQuery(
  cycleIds: string[],
  options?: { enabled?: boolean },
) {
  const { authFetch, clientId, readEnabled } = useGovernanceCyclesReadContext(options);
  const enabled = readEnabled && cycleIds.length > 0 && (options?.enabled !== false);

  return useQueries({
    queries: cycleIds.map((cycleId) => ({
      queryKey: governanceCyclesKeys.summary(clientId, cycleId),
      queryFn: () => getGovernanceCycleSummary(authFetch, cycleId),
      enabled,
      retry: false,
    })),
  });
}

export { useGovernanceCyclesReadContext };
