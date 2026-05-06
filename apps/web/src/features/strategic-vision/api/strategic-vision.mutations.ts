'use client';

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { strategicDirectionStrategyKeys } from '@/features/strategic-direction-strategy/lib/strategic-direction-strategy-query-keys';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  addStrategicObjectiveLink,
  createStrategicAxis,
  createStrategicDirection,
  createStrategicObjective,
  createStrategicVision,
  deleteStrategicDirection,
  removeStrategicObjectiveLink,
  type CreateStrategicAxisInput,
  type CreateStrategicDirectionInput,
  type CreateStrategicObjectiveInput,
  type CreateStrategicObjectiveLinkInput,
  type CreateStrategicVisionInput,
  updateStrategicAxis,
  updateStrategicDirection,
  updateStrategicObjective,
  updateStrategicVision,
  type UpdateStrategicAxisInput,
  type UpdateStrategicDirectionInput,
  type UpdateStrategicObjectiveInput,
  type UpdateStrategicVisionInput,
} from './strategic-vision.api';
import { strategicVisionKeys } from '../lib/strategic-vision-query-keys';

async function invalidateAllStrategicVisionQueries(queryClient: QueryClient, clientId: string) {
  await queryClient.invalidateQueries({
    queryKey: strategicVisionKeys.all(clientId),
  });
}

async function invalidateStrategicDirectionRelatedQueries(queryClient: QueryClient, clientId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: strategicVisionKeys.directions(clientId) }),
    queryClient.invalidateQueries({ queryKey: strategicVisionKeys.kpisByDirection(clientId) }),
    queryClient.invalidateQueries({ queryKey: strategicVisionKeys.objectives(clientId) }),
    queryClient.invalidateQueries({ queryKey: strategicVisionKeys.list(clientId) }),
    queryClient.invalidateQueries({ queryKey: strategicDirectionStrategyKeys.root(clientId) }),
  ]);
}

async function invalidateStrategicAlignmentQueries(
  queryClient: QueryClient,
  clientId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: strategicVisionKeys.objectives(clientId) }),
    queryClient.invalidateQueries({ queryKey: strategicVisionKeys.kpis(clientId) }),
    queryClient.invalidateQueries({ queryKey: strategicVisionKeys.kpisByDirection(clientId) }),
    queryClient.invalidateQueries({ queryKey: strategicVisionKeys.alertsBase(clientId) }),
  ]);
}

export function useUpdateStrategicAxisMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ axisId, body }: { axisId: string; body: UpdateStrategicAxisInput }) =>
      updateStrategicAxis(authFetch, axisId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategicVisionKeys.axes(clientId, null) }),
        queryClient.invalidateQueries({ queryKey: strategicVisionKeys.list(clientId) }),
      ]);
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategicVisionKeys.axes(clientId, null) }),
        queryClient.invalidateQueries({ queryKey: strategicVisionKeys.list(clientId) }),
      ]);
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
      await invalidateStrategicAlignmentQueries(queryClient, clientId);
    },
  });
}

export function useUpdateStrategicVisionMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ visionId, body }: { visionId: string; body: UpdateStrategicVisionInput }) =>
      updateStrategicVision(authFetch, visionId, body),
    onSuccess: async () => {
      await invalidateAllStrategicVisionQueries(queryClient, clientId);
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
      await invalidateAllStrategicVisionQueries(queryClient, clientId);
    },
  });
}

export function useCreateStrategicObjectiveMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateStrategicObjectiveInput) => createStrategicObjective(authFetch, body),
    onSuccess: async () => {
      await invalidateStrategicAlignmentQueries(queryClient, clientId);
    },
  });
}

export function useAddStrategicObjectiveLinkMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ objectiveId, body }: { objectiveId: string; body: CreateStrategicObjectiveLinkInput }) =>
      addStrategicObjectiveLink(authFetch, objectiveId, body),
    onSuccess: async (_, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategicVisionKeys.links(clientId, vars.objectiveId) }),
        invalidateStrategicAlignmentQueries(queryClient, clientId),
      ]);
    },
  });
}

export function useRemoveStrategicObjectiveLinkMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ objectiveId, linkId }: { objectiveId: string; linkId: string }) =>
      removeStrategicObjectiveLink(authFetch, objectiveId, linkId),
    onSuccess: async (_, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategicVisionKeys.links(clientId, vars.objectiveId) }),
        invalidateStrategicAlignmentQueries(queryClient, clientId),
      ]);
    },
  });
}

export function useCreateStrategicDirectionMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateStrategicDirectionInput) => createStrategicDirection(authFetch, body),
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
