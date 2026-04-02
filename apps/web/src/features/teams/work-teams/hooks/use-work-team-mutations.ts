'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  addWorkTeamMember,
  archiveWorkTeam,
  createWorkTeam,
  putManagerScope,
  removeWorkTeamMember,
  restoreWorkTeam,
  updateWorkTeam,
  updateWorkTeamMember,
} from '../api/work-teams.api';
import { workTeamQueryKeys } from '../lib/work-team-query-keys';
import type {
  AddWorkTeamMemberPayload,
  CreateWorkTeamPayload,
  PutManagerScopePayload,
  UpdateWorkTeamPayload,
} from '../types/work-team.types';
import type { WorkTeamMemberRole } from '../types/work-team.types';

function useClientId() {
  const { activeClient } = useActiveClient();
  return activeClient?.id ?? '';
}

export function useCreateWorkTeam() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const clientId = useClientId();

  return useMutation({
    mutationFn: (payload: CreateWorkTeamPayload) => createWorkTeam(authFetch, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workTeamQueryKeys.all });
    },
  });
}

export function useUpdateWorkTeam(teamId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const clientId = useClientId();

  return useMutation({
    mutationFn: (payload: UpdateWorkTeamPayload) => updateWorkTeam(authFetch, teamId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workTeamQueryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: workTeamQueryKeys.detail(clientId, teamId),
      });
    },
  });
}

export function useArchiveWorkTeam() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveWorkTeam(authFetch, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workTeamQueryKeys.all });
    },
  });
}

export function useRestoreWorkTeam() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreWorkTeam(authFetch, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workTeamQueryKeys.all });
    },
  });
}

export function useAddWorkTeamMember(teamId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const clientId = useClientId();

  return useMutation({
    mutationFn: (payload: AddWorkTeamMemberPayload) =>
      addWorkTeamMember(authFetch, teamId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workTeamQueryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: [...workTeamQueryKeys.all, 'members', clientId, teamId],
      });
    },
  });
}

export function useUpdateWorkTeamMember(teamId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const clientId = useClientId();

  return useMutation({
    mutationFn: ({
      membershipId,
      role,
    }: {
      membershipId: string;
      role: WorkTeamMemberRole;
    }) => updateWorkTeamMember(authFetch, teamId, membershipId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...workTeamQueryKeys.all, 'members', clientId, teamId],
      });
    },
  });
}

export function useRemoveWorkTeamMember(teamId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const clientId = useClientId();

  return useMutation({
    mutationFn: (membershipId: string) =>
      removeWorkTeamMember(authFetch, teamId, membershipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workTeamQueryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: [...workTeamQueryKeys.all, 'members', clientId, teamId],
      });
    },
  });
}

export function usePutManagerScope(managerCollaboratorId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const clientId = useClientId();

  return useMutation({
    mutationFn: (payload: PutManagerScopePayload) =>
      putManagerScope(authFetch, managerCollaboratorId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workTeamQueryKeys.managerScope(clientId, managerCollaboratorId),
      });
      void queryClient.invalidateQueries({
        queryKey: [...workTeamQueryKeys.all, 'manager-scope-preview', clientId, managerCollaboratorId],
      });
    },
  });
}
