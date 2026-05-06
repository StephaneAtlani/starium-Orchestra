'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  getStrategicVisionAlerts,
  getStrategicVisionKpis,
  getStrategicVisionKpisByDirection,
  listStrategicAxes,
  listStrategicDirections,
  listStrategicObjectives,
  listStrategicVisions,
} from './strategic-vision.api';
import { strategicVisionKeys } from '../lib/strategic-vision-query-keys';

export function useStrategicVisionQuery(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: strategicVisionKeys.list(clientId),
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
    queryKey: strategicVisionKeys.axes(clientId, null),
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
