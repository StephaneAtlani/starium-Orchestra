'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  listStrategicDirections,
  listStrategicVisions,
} from '@/features/strategic-vision/api/strategic-vision.api';
import {
  createStrategicDirectionStrategy,
  type CreateStrategicDirectionStrategyInput,
  getStrategicDirectionStrategy,
  getStrategicDirectionStrategyLinks,
  archiveStrategicDirectionStrategy,
  listStrategicDirectionStrategies,
  putStrategicDirectionStrategyAxes,
  putStrategicDirectionStrategyObjectives,
  reviewStrategicDirectionStrategy,
  submitStrategicDirectionStrategy,
  updateStrategicDirectionStrategy,
  type UpdateStrategicDirectionStrategyInput,
} from '../api/strategic-direction-strategy.api';
import { strategicDirectionStrategyKeys } from '../lib/strategic-direction-strategy-query-keys';

async function invalidateStrategicDirectionStrategyScope(queryClient: QueryClient, clientId: string) {
  await queryClient.invalidateQueries({ queryKey: strategicDirectionStrategyKeys.root(clientId) });
}

export function useStrategicDirectionOptionsQuery(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: [...strategicDirectionStrategyKeys.root(clientId), 'direction-options'],
    queryFn: () => listStrategicDirections(authFetch),
    enabled: Boolean(clientId) && enabled,
  });
}

export function useStrategicVisionOptionsQuery(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: [...strategicDirectionStrategyKeys.root(clientId), 'vision-options'],
    queryFn: () => listStrategicVisions(authFetch),
    enabled: Boolean(clientId) && enabled,
  });
}

export function useStrategicDirectionStrategiesQuery(
  filters: {
    directionId?: string | null;
    alignedVisionId?: string | null;
    status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED' | null;
    search?: string | null;
    includeArchived?: boolean;
  },
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: strategicDirectionStrategyKeys.list(clientId, {
      directionId: filters.directionId ?? undefined,
      alignedVisionId: filters.alignedVisionId ?? undefined,
      status: filters.status ?? undefined,
      search: filters.search?.trim() ? filters.search.trim() : undefined,
      includeArchived: filters.includeArchived === true ? true : undefined,
    }),
    queryFn: () =>
      listStrategicDirectionStrategies(authFetch, {
        directionId: filters.directionId ?? undefined,
        alignedVisionId: filters.alignedVisionId ?? undefined,
        status: filters.status ?? undefined,
        search: filters.search?.trim() ? filters.search.trim() : undefined,
        includeArchived: filters.includeArchived === true ? true : undefined,
      }),
    enabled: Boolean(clientId) && enabled,
  });
}

export function useStrategicDirectionStrategyDetailQuery(
  strategyId: string | null,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: strategicDirectionStrategyKeys.detail(clientId, strategyId),
    queryFn: () => getStrategicDirectionStrategy(authFetch, strategyId!),
    enabled: Boolean(clientId) && Boolean(strategyId) && enabled,
  });
}

export function useStrategicDirectionStrategyLinksQuery(
  strategyId: string | null,
  options?: { enabled?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: strategicDirectionStrategyKeys.links(clientId, strategyId),
    queryFn: () => getStrategicDirectionStrategyLinks(authFetch, strategyId!),
    enabled: Boolean(clientId) && Boolean(strategyId) && enabled,
  });
}

export function useCreateStrategicDirectionStrategyMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStrategicDirectionStrategyInput) =>
      createStrategicDirectionStrategy(authFetch, body),
    onSuccess: async () => {
      await invalidateStrategicDirectionStrategyScope(queryClient, clientId);
    },
  });
}

export function useUpdateStrategicDirectionStrategyMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ strategyId, body }: { strategyId: string; body: UpdateStrategicDirectionStrategyInput }) =>
      updateStrategicDirectionStrategy(authFetch, strategyId, body),
    onSuccess: async () => {
      await invalidateStrategicDirectionStrategyScope(queryClient, clientId);
    },
  });
}

export function useSubmitStrategicDirectionStrategyMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ strategyId, alignedVisionId }: { strategyId: string; alignedVisionId: string }) =>
      submitStrategicDirectionStrategy(authFetch, strategyId, alignedVisionId),
    onSuccess: async () => {
      await invalidateStrategicDirectionStrategyScope(queryClient, clientId);
    },
  });
}

export function useReviewStrategicDirectionStrategyMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      strategyId,
      body,
    }: {
      strategyId: string;
      body: { decision: 'APPROVED' | 'REJECTED'; rejectionReason?: string };
    }) => reviewStrategicDirectionStrategy(authFetch, strategyId, body),
    onSuccess: async () => {
      await invalidateStrategicDirectionStrategyScope(queryClient, clientId);
    },
  });
}

export function useArchiveStrategicDirectionStrategyMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ strategyId, reason }: { strategyId: string; reason: string }) =>
      archiveStrategicDirectionStrategy(authFetch, strategyId, reason),
    onSuccess: async () => {
      await invalidateStrategicDirectionStrategyScope(queryClient, clientId);
    },
  });
}

export function useReplaceStrategicDirectionStrategyAxesMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      strategyId,
      strategicAxisIds,
    }: {
      strategyId: string;
      strategicAxisIds: string[];
    }) => putStrategicDirectionStrategyAxes(authFetch, strategyId, strategicAxisIds),
    onSuccess: async () => {
      await invalidateStrategicDirectionStrategyScope(queryClient, clientId);
    },
  });
}

export function useReplaceStrategicDirectionStrategyObjectivesMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      strategyId,
      strategicObjectiveIds,
    }: {
      strategyId: string;
      strategicObjectiveIds: string[];
    }) => putStrategicDirectionStrategyObjectives(authFetch, strategyId, strategicObjectiveIds),
    onSuccess: async () => {
      await invalidateStrategicDirectionStrategyScope(queryClient, clientId);
    },
  });
}
