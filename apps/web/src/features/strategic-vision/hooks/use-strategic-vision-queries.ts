'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  getStrategicVisionAlerts,
  getStrategicVisionKpis,
  listStrategicAxes,
  listStrategicObjectives,
  listStrategicVisions,
  type UpdateStrategicAxisInput,
  type UpdateStrategicObjectiveInput,
  updateStrategicAxis,
  updateStrategicObjective,
} from '../api/strategic-vision.api';
import { strategicVisionKeys } from '../lib/strategic-vision-query-keys';

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

export function useStrategicAlertsQuery(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: strategicVisionKeys.alerts(clientId),
    queryFn: () => getStrategicVisionAlerts(authFetch),
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
