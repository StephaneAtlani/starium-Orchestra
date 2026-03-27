'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  addGroupScope,
  createConnection,
  deleteGroupScope,
  executeSync,
  previewSync,
  testConnection,
  updateConnection,
} from '../api/team-sync.api';
import type { DirectoryConnection } from '../types/team-sync.types';

export function useTeamSyncMutations() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['team-sync', 'connections'] }),
      queryClient.invalidateQueries({ queryKey: ['team-sync', 'group-scopes'] }),
      queryClient.invalidateQueries({ queryKey: ['team-sync', 'jobs'] }),
      queryClient.invalidateQueries({ queryKey: ['team-sync', 'provider-groups'] }),
    ]);
  };

  const createConnectionMutation = useMutation({
    mutationFn: (payload: Partial<DirectoryConnection> & { name: string }) =>
      createConnection(authFetch, payload),
    onSuccess: invalidate,
  });

  const updateConnectionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<DirectoryConnection> }) =>
      updateConnection(authFetch, id, payload),
    onSuccess: invalidate,
  });

  const testConnectionMutation = useMutation({
    mutationFn: (id: string) => testConnection(authFetch, id),
  });

  const addGroupScopeMutation = useMutation({
    mutationFn: (args: { connectionId: string; groupId: string; groupName?: string }) =>
      addGroupScope(authFetch, args.connectionId, {
        groupId: args.groupId,
        groupName: args.groupName,
      }),
    onSuccess: invalidate,
  });

  const deleteGroupScopeMutation = useMutation({
    mutationFn: (args: { connectionId: string; groupScopeId: string }) =>
      deleteGroupScope(authFetch, args.connectionId, args.groupScopeId),
    onSuccess: invalidate,
  });

  const previewSyncMutation = useMutation({
    mutationFn: (connectionId: string) => previewSync(authFetch, connectionId),
  });

  const executeSyncMutation = useMutation({
    mutationFn: (connectionId: string) => executeSync(authFetch, connectionId),
    onSuccess: invalidate,
  });

  return {
    createConnectionMutation,
    updateConnectionMutation,
    testConnectionMutation,
    addGroupScopeMutation,
    deleteGroupScopeMutation,
    previewSyncMutation,
    executeSyncMutation,
  };
}
