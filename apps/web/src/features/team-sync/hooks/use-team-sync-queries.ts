'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  listConnections,
  listGroupScopes,
  listJobs,
  listProviderGroups,
} from '../api/team-sync.api';

export function useDirectoryConnectionsQuery() {
  const authFetch = useAuthenticatedFetch();
  return useQuery({
    queryKey: ['team-sync', 'connections'],
    queryFn: () => listConnections(authFetch),
  });
}

export function useDirectoryGroupScopesQuery(connectionId?: string | null) {
  const authFetch = useAuthenticatedFetch();
  return useQuery({
    queryKey: ['team-sync', 'group-scopes', connectionId],
    queryFn: () => listGroupScopes(authFetch, connectionId!),
    enabled: Boolean(connectionId),
  });
}

export function useProviderGroupsQuery(connectionId?: string | null) {
  const authFetch = useAuthenticatedFetch();
  return useQuery({
    queryKey: ['team-sync', 'provider-groups', connectionId],
    queryFn: () => listProviderGroups(authFetch, connectionId!),
    enabled: Boolean(connectionId),
  });
}

export function useDirectoryJobsQuery() {
  const authFetch = useAuthenticatedFetch();
  return useQuery({
    queryKey: ['team-sync', 'jobs'],
    queryFn: () => listJobs(authFetch),
  });
}
