'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  generateMonthlySettings,
  getMemberMonthly,
  listAllocations,
  patchPrimaryWorkTeam,
  putMemberMonthly,
  putMonthlySettings,
  getDashboardResources,
  getDashboardWorkTeams,
  getDashboardPortfolio,
  createAllocation,
  updateAllocation,
  deleteAllocation,
} from '../api/capacity.api';
import { capacityQueryKeys } from '../lib/capacity-query-keys';

export function useGenerateCapacityMonthly() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const qc = useQueryClient();
  const clientId = activeClient?.id ?? '';
  return useMutation({
    mutationFn: (body: { year: number; force?: boolean }) =>
      generateMonthlySettings(authFetch, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: capacityQueryKeys.all(clientId) });
    },
  });
}

export function usePutCapacityMonthlySettings() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const qc = useQueryClient();
  const clientId = activeClient?.id ?? '';
  return useMutation({
    mutationFn: (items: Array<{ yearMonth: string; days: number }>) =>
      putMonthlySettings(authFetch, items),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: capacityQueryKeys.all(clientId) });
    },
  });
}

export function useMemberMonthlyCapacity(
  resourceId: string | undefined,
  params: { from?: string; to?: string } = {},
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  return useQuery({
    queryKey: capacityQueryKeys.memberMonthly(clientId, resourceId ?? '', params.from, params.to),
    queryFn: () => getMemberMonthly(authFetch, resourceId!, params),
    enabled: !!clientId && !!resourceId && (options?.enabled ?? true),
  });
}

export function usePutMemberMonthlyCapacity(resourceId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const qc = useQueryClient();
  const clientId = activeClient?.id ?? '';
  return useMutation({
    mutationFn: (items: Array<{ yearMonth: string; days: number | null }>) =>
      putMemberMonthly(authFetch, resourceId, items),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: capacityQueryKeys.all(clientId) });
    },
  });
}

export function usePatchPrimaryWorkTeam(resourceId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const qc = useQueryClient();
  const clientId = activeClient?.id ?? '';
  return useMutation({
    mutationFn: (primaryCapacityWorkTeamId: string | null) =>
      patchPrimaryWorkTeam(authFetch, resourceId, primaryCapacityWorkTeamId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: capacityQueryKeys.all(clientId) });
    },
  });
}

export function useCapacityAllocations(
  params: {
    limit?: number;
    offset?: number;
    yearMonth?: string;
    workTeamId?: string;
    resourceId?: string;
  } = {},
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  return useQuery({
    queryKey: capacityQueryKeys.allocations(clientId, params),
    queryFn: () => listAllocations(authFetch, params),
    enabled: !!clientId && (options?.enabled ?? true),
  });
}

export function useCapacityAllocationMutations() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const qc = useQueryClient();
  const clientId = activeClient?.id ?? '';
  const invalidate = () => void qc.invalidateQueries({ queryKey: capacityQueryKeys.all(clientId) });
  return {
    create: useMutation({
      mutationFn: createAllocation.bind(null, authFetch),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
        updateAllocation(authFetch, id, payload),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteAllocation(authFetch, id),
      onSuccess: invalidate,
    }),
  };
}

export function useCapacityDashboard(
  tab: 'resources' | 'work-teams' | 'portfolio',
  params: { from: string; to: string; includeArchivedWorkTeams?: boolean },
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = !!clientId && !!params.from && !!params.to && (options?.enabled ?? true);
  return useQuery({
    queryKey:
      tab === 'resources'
        ? capacityQueryKeys.dashboardResources(clientId, params)
        : tab === 'work-teams'
          ? capacityQueryKeys.dashboardWorkTeams(clientId, params)
          : capacityQueryKeys.dashboardPortfolio(clientId, params),
    queryFn: () => {
      if (tab === 'resources') return getDashboardResources(authFetch, params);
      if (tab === 'work-teams') return getDashboardWorkTeams(authFetch, params);
      return getDashboardPortfolio(authFetch, params);
    },
    enabled,
  });
}
