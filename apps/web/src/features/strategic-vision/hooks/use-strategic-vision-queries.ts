'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  getStrategicVisionAlerts,
  getStrategicVisionKpis,
  listStrategicAxes,
  listStrategicObjectives,
  listStrategicVisions,
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
  const filters = {};

  return useQuery({
    queryKey: strategicVisionKeys.objectives(clientId, filters),
    queryFn: () => listStrategicObjectives(authFetch),
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

export function useStrategicAxesQuery(options?: { enabled?: boolean }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: strategicVisionKeys.axes(clientId),
    queryFn: () => listStrategicAxes(authFetch),
    enabled: Boolean(clientId) && enabled,
  });
}
