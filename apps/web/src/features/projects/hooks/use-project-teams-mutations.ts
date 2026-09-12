'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  createProjectTeam,
  deleteProjectTeam,
  updateProjectTeam,
  type CreateProjectTeamBody,
  type UpdateProjectTeamBody,
} from '../api/project-governance-circles.api';
import { projectQueryKeys } from '../lib/project-query-keys';

export function useProjectTeamsMutations(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.governanceCircles(clientId, projectId),
    });
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.team(clientId, projectId),
    });
  };

  const createTeam = useMutation({
    mutationFn: (body: CreateProjectTeamBody) =>
      createProjectTeam(authFetch, projectId, body),
    onSuccess: invalidate,
  });

  const updateTeam = useMutation({
    mutationFn: ({
      teamId,
      body,
    }: {
      teamId: string;
      body: UpdateProjectTeamBody;
    }) => updateProjectTeam(authFetch, projectId, teamId, body),
    onSuccess: invalidate,
  });

  const deleteTeam = useMutation({
    mutationFn: (teamId: string) =>
      deleteProjectTeam(authFetch, projectId, teamId),
    onSuccess: invalidate,
  });

  return { createTeam, updateTeam, deleteTeam, invalidate };
}
