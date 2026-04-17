'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  archiveProjectScenario,
  createProjectScenario,
  duplicateProjectScenario,
  selectProjectScenario,
  updateProjectScenario,
} from '../api/projects.api';
import type {
  CreateProjectScenarioPayload,
  SelectProjectScenarioPayload,
  UpdateProjectScenarioPayload,
} from '../types/project.types';
import { projectQueryKeys } from '../lib/project-query-keys';
import { invalidateAfterScenarioUpdate } from '../scenario-workspace/invalidate-after-scenario-update';

export function useProjectScenariosMutations(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.detail(clientId, projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.scenarios(clientId, projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: [...projectQueryKeys.all, 'scenario-detail', clientId, projectId],
      }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateProjectScenarioPayload) =>
      createProjectScenario(authFetch, projectId, payload),
    onSuccess: async () => {
      await invalidate();
      toast.success('Scénario créé');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Création du scénario impossible');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (scenarioId: string) => duplicateProjectScenario(authFetch, projectId, scenarioId),
    onSuccess: async () => {
      await invalidate();
      toast.success('Scénario dupliqué');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Duplication du scénario impossible');
    },
  });

  const selectMutation = useMutation({
    mutationFn: ({
      scenarioId,
      payload,
    }: {
      scenarioId: string;
      payload?: SelectProjectScenarioPayload;
    }) => selectProjectScenario(authFetch, projectId, scenarioId, payload),
    onSuccess: async () => {
      await invalidate();
      toast.success('Baseline mise à jour');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Sélection du scénario impossible');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (scenarioId: string) => archiveProjectScenario(authFetch, projectId, scenarioId),
    onSuccess: async () => {
      await invalidate();
      toast.success('Scénario archivé');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Archivage du scénario impossible');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      scenarioId,
      payload,
    }: {
      scenarioId: string;
      payload: UpdateProjectScenarioPayload;
    }) => updateProjectScenario(authFetch, projectId, scenarioId, payload),
    onSuccess: async (_data, variables) => {
      await invalidateAfterScenarioUpdate(
        queryClient,
        clientId,
        projectId,
        variables.scenarioId,
      );
      toast.success('Scénario mis à jour');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Mise à jour du scénario impossible');
    },
  });

  return {
    createMutation,
    duplicateMutation,
    selectMutation,
    archiveMutation,
    updateMutation,
    isAnyPending:
      createMutation.isPending ||
      duplicateMutation.isPending ||
      selectMutation.isPending ||
      archiveMutation.isPending ||
      updateMutation.isPending,
  };
}
