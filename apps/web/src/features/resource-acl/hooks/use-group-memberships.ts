'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getAccessGroupMembers } from '@/features/access-groups/api/access-groups';
import { accessGroupsKeys } from '@/features/access-groups/query-keys';

/** Snapshot des membres d'un groupe — `Set` pour lookups O(1) côté lib `admin-capacity`. */
export interface GroupMembership {
  groupId: string;
  memberUserIds: Set<string>;
}

interface UseGroupMembershipsResult {
  groupMemberships: GroupMembership[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Charge en parallèle les membres de N groupes via `useQueries` — pattern obligatoire
 * pour respecter les règles React Hooks (`useGroupMembers(groupId)` ne peut PAS être
 * appelé dans une boucle).
 *
 * - `groupIds` est dédoublonné et trié pour stabiliser l'identité du tableau de queries
 *   (évite re-fetch infini si la liste d'entries ACL est recalculée à chaque render).
 * - `isLoading === true` → bloquer les actions destructives côté éditeur, snapshot ADMIN
 *   non fiable.
 * - À la suppression d'un `groupId`, React Query libère naturellement la query
 *   (gcTime standard).
 */
export function useGroupMemberships(
  groupIds: string[],
): UseGroupMembershipsResult {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  const stableGroupIds = useMemo(() => {
    return Array.from(new Set(groupIds.filter(Boolean))).sort();
  }, [groupIds]);

  const results = useQueries({
    queries: stableGroupIds.map((groupId) => ({
      queryKey: accessGroupsKeys.members(activeClientId, groupId),
      queryFn: () => getAccessGroupMembers(authFetch, groupId),
      enabled: !!activeClientId && !!groupId,
      staleTime: 30_000,
    })),
  });

  const groupMemberships = useMemo<GroupMembership[]>(() => {
    return stableGroupIds.map((groupId, index) => {
      const data = results[index]?.data ?? [];
      return {
        groupId,
        memberUserIds: new Set(data.map((row) => row.userId)),
      };
    });
  }, [stableGroupIds, results]);

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);

  return { groupMemberships, isLoading, isError };
}
