'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { strategicDirectionStrategyKeys } from '@/features/strategic-direction-strategy/lib/strategic-direction-strategy-query-keys';
import {
  createStrategicDirection,
  type CreateStrategicDirectionInput,
  deleteStrategicDirection,
  updateStrategicDirection,
  type UpdateStrategicDirectionInput,
  createStrategicVision,
  type CreateStrategicVisionInput,
  createStrategicAxis,
  type CreateStrategicAxisInput,
  createStrategicObjective,
  type CreateStrategicObjectiveInput,
  getStrategicVisionAlerts,
  getStrategicVisionKpisByDirection,
  getStrategicVisionKpis,
  listStrategicDirections,
  listStrategicAxes,
  listStrategicObjectives,
  listStrategicVisions,
  type UpdateStrategicAxisInput,
  type UpdateStrategicVisionInput,
  type UpdateStrategicObjectiveInput,
  updateStrategicAxis,
  updateStrategicVision,
  updateStrategicObjective,
} from '../api/strategic-vision.api';
import { strategicVisionKeys } from '../lib/strategic-vision-query-keys';
import type { QueryClient } from '@tanstack/react-query';

async function invalidateStrategicDirectionRelatedQueries(queryClient: QueryClient, clientId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: strategicVisionKeys.directions(clientId) }),
    queryClient.invalidateQueries({ queryKey: strategicVisionKeys.kpisByDirection(clientId) }),
    queryClient.invalidateQueries({ queryKey: strategicVisionKeys.root(clientId) }),
    queryClient.invalidateQueries({ queryKey: strategicVisionKeys.objectives(clientId) }),
    queryClient.invalidateQueries({ queryKey: strategicDirectionStrategyKeys.root(clientId) }),
  ]);
}

export function useStrategicVisionQuery(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: strategicVisionKeys.root(clientId),
    queryFn: () => listStrategicVisions(authFetch),
    enabled: Boolean(clientId) && enabled,
  });
}

export function useStrategicObjectivesQuery(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: strategicVisionKeys.objectives(clientId),
    queryFn: () => listStrategicObjectives(authFetch),
    enabled: Boolean(clientId) && enabled,
  });
}

export function useStrategicAxesFallbackQuery(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: [...strategicVisionKeys.root(clientId), 'axes-fallback'],
    queryFn: () => listStrategicAxes(authFetch),
    enabled: Boolean(clientId) && enabled,
  });
}

export function useStrategicKpisQuery(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: strategicVisionKeys.kpis(clientId),
    queryFn: () => getStrategicVisionKpis(authFetch),
    enabled: Boolean(clientId) && enabled,
  });
}

export function useStrategicKpisByDirectionQuery(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: strategicVisionKeys.kpisByDirection(clientId),
    queryFn: () => getStrategicVisionKpisByDirection(authFetch),
    enabled: Boolean(clientId) && enabled,
  });
}

export function useStrategicDirectionsQuery(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: strategicVisionKeys.directions(clientId),
    queryFn: () => listStrategicDirections(authFetch),
    enabled: Boolean(clientId) && enabled,
  });
}

export function useStrategicAlertsQuery(
  options?: { enabled?: boolean; directionId?: string; unassigned?: boolean },
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: strategicVisionKeys.alerts(clientId, {
      directionId: options?.directionId,
      unassigned: options?.unassigned,
    }),
    queryFn: () =>
      getStrategicVisionAlerts(authFetch, {
        directionId: options?.directionId,
        unassigned: options?.unassigned,
      }),
    enabled: Boolean(clientId) && enabled,
  });
}

export function useUpdateStrategicAxisMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      axisId,
      body,
    }: {
      axisId: string;
      body: UpdateStrategicAxisInput;
    }) => updateStrategicAxis(authFetch, axisId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: strategicVisionKeys.root(clientId),
      });
    },
  });
}

export function useCreateStrategicAxisMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateStrategicAxisInput) => createStrategicAxis(authFetch, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: strategicVisionKeys.root(clientId),
      });
    },
  });
}

export function useUpdateStrategicObjectiveMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      objectiveId,
      body,
    }: {
      objectiveId: string;
      body: UpdateStrategicObjectiveInput;
    }) => updateStrategicObjective(authFetch, objectiveId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: strategicVisionKeys.root(clientId),
      });
    },
  });
}

export function useUpdateStrategicVisionMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      visionId,
      body,
    }: {
      visionId: string;
      body: UpdateStrategicVisionInput;
    }) => updateStrategicVision(authFetch, visionId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: strategicVisionKeys.root(clientId),
      });
    },
  });
}

export function useCreateStrategicVisionMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateStrategicVisionInput) => createStrategicVision(authFetch, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: strategicVisionKeys.root(clientId),
      });
    },
  });
}

export function useCreateStrategicObjectiveMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateStrategicObjectiveInput) =>
      createStrategicObjective(authFetch, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: strategicVisionKeys.root(clientId),
      });
    },
  });
}

export function useCreateStrategicDirectionMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateStrategicDirectionInput) =>
      createStrategicDirection(authFetch, body),
    onSuccess: async () => {
      await invalidateStrategicDirectionRelatedQueries(queryClient, clientId);
    },
  });
}

export function useUpdateStrategicDirectionMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      directionId,
      body,
    }: {
      directionId: string;
      body: UpdateStrategicDirectionInput;
    }) => updateStrategicDirection(authFetch, directionId, body),
    onSuccess: async () => {
      await invalidateStrategicDirectionRelatedQueries(queryClient, clientId);
    },
  });
}

export function useDeleteStrategicDirectionMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (directionId: string) => deleteStrategicDirection(authFetch, directionId),
    onSuccess: async () => {
      await invalidateStrategicDirectionRelatedQueries(queryClient, clientId);
    },
  });
}

