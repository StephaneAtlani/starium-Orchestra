'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  cancelProjectResourceAssignment,
  cancelTeamResourceAssignment,
  createProjectResourceAssignment,
  createTeamResourceAssignment,
  updateProjectResourceAssignment,
  updateTeamResourceAssignment,
} from '../api/team-assignments.api';
import { teamAssignmentQueryKeys } from '../lib/team-assignment-query-keys';
import type {
  CreateProjectResourceAssignmentPayload,
  CreateTeamResourceAssignmentPayload,
  UpdateProjectResourceAssignmentPayload,
  UpdateTeamResourceAssignmentPayload,
} from '../types/team-assignment.types';

export function useTeamAssignmentMutations() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: teamAssignmentQueryKeys.all });

  const createGlobal = useMutation({
    mutationFn: (payload: CreateTeamResourceAssignmentPayload) =>
      createTeamResourceAssignment(authFetch, payload),
    onSuccess: () => invalidateAll(),
  });

  const updateGlobal = useMutation({
    mutationFn: (args: {
      id: string;
      payload: UpdateTeamResourceAssignmentPayload;
    }) => updateTeamResourceAssignment(authFetch, args.id, args.payload),
    onSuccess: () => invalidateAll(),
  });

  const cancelGlobal = useMutation({
    mutationFn: (id: string) => cancelTeamResourceAssignment(authFetch, id),
    onSuccess: () => invalidateAll(),
  });

  const createProject = useMutation({
    mutationFn: ({
      projectId,
      payload,
    }: {
      projectId: string;
      payload: CreateProjectResourceAssignmentPayload;
    }) => createProjectResourceAssignment(authFetch, projectId, payload),
    onSuccess: () => invalidateAll(),
  });

  const updateProject = useMutation({
    mutationFn: ({
      projectId,
      assignmentId,
      payload,
    }: {
      projectId: string;
      assignmentId: string;
      payload: UpdateProjectResourceAssignmentPayload;
    }) =>
      updateProjectResourceAssignment(
        authFetch,
        projectId,
        assignmentId,
        payload,
      ),
    onSuccess: () => invalidateAll(),
  });

  const cancelProject = useMutation({
    mutationFn: ({
      projectId,
      assignmentId,
    }: {
      projectId: string;
      assignmentId: string;
    }) => cancelProjectResourceAssignment(authFetch, projectId, assignmentId),
    onSuccess: () => invalidateAll(),
  });

  return {
    clientId,
    createGlobal,
    updateGlobal,
    cancelGlobal,
    createProject,
    updateProject,
    cancelProject,
  };
}
