'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  mergeUiBadgeConfig,
  parseUiBadgeConfig,
  type MergedUiBadges,
  type UiBadgeConfig,
} from '@/lib/ui/badge-registry';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';

const STALE_MS = 60_000;

type BadgeLayers = { platform: UiBadgeConfig | null; client: UiBadgeConfig | null };

async function fetchUiBadges(
  authFetch: ReturnType<typeof useAuthenticatedFetch>,
): Promise<BadgeLayers> {
  const res = await authFetch('/api/clients/active/ui-badges');
  if (!res.ok) {
    throw new Error(`ui-badges ${res.status}`);
  }
  const json = (await res.json()) as {
    clientConfig: unknown;
    platformDefaults: unknown;
  };
  return {
    platform: parseUiBadgeConfig(json.platformDefaults),
    client: parseUiBadgeConfig(json.clientConfig),
  };
}

/**
 * Config badges fusionnée (code → plateforme → client).
 * Toujours utiliser `merged` pour l’affichage.
 */
export function useClientUiBadgeConfig(): {
  merged: MergedUiBadges;
  platform: UiBadgeConfig | null;
  client: UiBadgeConfig | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const q = useQuery({
    queryKey: projectQueryKeys.clientUiBadges(clientId),
    queryFn: () => fetchUiBadges(authFetch),
    enabled: !!clientId,
    staleTime: STALE_MS,
  });

  const merged = useMemo(
    () => mergeUiBadgeConfig(q.data?.platform ?? null, q.data?.client ?? null),
    [q.data],
  );

  return {
    merged,
    platform: q.data?.platform ?? null,
    client: q.data?.client ?? null,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error as Error | null,
    refetch: () => {
      void q.refetch();
    },
  };
}
