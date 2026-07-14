'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useGovernanceCyclesReadContext } from './governance-cycles.queries';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import { governanceCyclesKeys } from '../lib/governance-cycles-query-keys';
import {
  closeGovernanceCycleInstance,
  createGovernanceCycleInstance,
  generateGovernanceCycleInstances,
  getGovernanceCycleInstance,
  listGovernanceCycleInstances,
  cancelGovernanceCycleInstance,
  openGovernanceCycleInstance,
  updateGovernanceCycleInstance,
  patchGovernanceCycleInstanceDecisions,
  replaceGovernanceCycleInstanceAgenda,
  submitProjectToGovernanceCycle,
} from './governance-cycle-instances.api';
import { getApiErrorMessage } from './governance-cycles.mutations';

export { getApiErrorMessage };

export function useGovernanceCycleInstancesQuery(
  cycleId: string,
  options?: { enabled?: boolean; includeArchived?: boolean; eager?: boolean },
) {
  const { authFetch, clientId, readEnabled } = useGovernanceCyclesReadContext(options);
  return useQuery({
    queryKey: governanceCyclesKeys.instances(clientId, cycleId, {
      includeArchived: options?.includeArchived,
    }),
    queryFn: () =>
      listGovernanceCycleInstances(authFetch, cycleId, options?.includeArchived),
    enabled: readEnabled && Boolean(cycleId),
  });
}

/** Instances par cycle — échec isolé pour le cockpit. */
export function useGovernanceCycleInstancesForIdsQuery(
  cycleIds: string[],
  options?: { enabled?: boolean },
) {
  const { authFetch, clientId, readEnabled } = useGovernanceCyclesReadContext(options);
  const enabled = readEnabled && cycleIds.length > 0 && (options?.enabled !== false);

  return useQueries({
    queries: cycleIds.map((cycleId) => ({
      queryKey: governanceCyclesKeys.instances(clientId, cycleId, {}),
      queryFn: () => listGovernanceCycleInstances(authFetch, cycleId),
      enabled,
      retry: false,
    })),
  });
}

export function useGovernanceCycleInstanceDetailQuery(
  cycleId: string,
  instanceId: string | null,
  options?: { enabled?: boolean },
) {
  const { authFetch, clientId, readEnabled } = useGovernanceCyclesReadContext(options);
  return useQuery({
    queryKey: governanceCyclesKeys.instanceDetail(clientId, cycleId, instanceId ?? ''),
    queryFn: () => getGovernanceCycleInstance(authFetch, cycleId, instanceId!),
    enabled: readEnabled && Boolean(cycleId && instanceId),
  });
}

export function useCreateGovernanceCycleInstanceMutation(cycleId: string) {
  const { authFetch, clientId } = useGovernanceCyclesReadContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      createGovernanceCycleInstance(authFetch, cycleId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: governanceCyclesKeys.instances(clientId, cycleId) });
    },
  });
}

export function useUpdateGovernanceCycleInstanceMutation(cycleId: string, instanceId: string) {
  const { authFetch, clientId } = useGovernanceCyclesReadContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      updateGovernanceCycleInstance(authFetch, cycleId, instanceId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: governanceCyclesKeys.instances(clientId, cycleId) });
      void qc.invalidateQueries({
        queryKey: governanceCyclesKeys.instanceDetail(clientId, cycleId, instanceId),
      });
    },
  });
}

export function useCancelGovernanceCycleInstanceMutation(cycleId: string) {
  const { authFetch, clientId } = useGovernanceCyclesReadContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) =>
      cancelGovernanceCycleInstance(authFetch, cycleId, instanceId),
    onSuccess: (_d, instanceId) => {
      void qc.invalidateQueries({ queryKey: governanceCyclesKeys.instances(clientId, cycleId) });
      void qc.invalidateQueries({
        queryKey: governanceCyclesKeys.instanceDetail(clientId, cycleId, instanceId),
      });
    },
  });
}

export function useOpenGovernanceCycleInstanceMutation(cycleId: string) {
  const { authFetch, clientId } = useGovernanceCyclesReadContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) => openGovernanceCycleInstance(authFetch, cycleId, instanceId),
    onSuccess: (_d, instanceId) => {
      void qc.invalidateQueries({ queryKey: governanceCyclesKeys.instances(clientId, cycleId) });
      void qc.invalidateQueries({
        queryKey: governanceCyclesKeys.instanceDetail(clientId, cycleId, instanceId),
      });
    },
  });
}

export function useCloseGovernanceCycleInstanceMutation(cycleId: string) {
  const { authFetch, clientId } = useGovernanceCyclesReadContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (instanceId: string) => closeGovernanceCycleInstance(authFetch, cycleId, instanceId),
    onSuccess: (_d, instanceId) => {
      void qc.invalidateQueries({ queryKey: governanceCyclesKeys.instances(clientId, cycleId) });
      void qc.invalidateQueries({
        queryKey: governanceCyclesKeys.instanceDetail(clientId, cycleId, instanceId),
      });
      void qc.invalidateQueries({ queryKey: governanceCyclesKeys.detail(clientId, cycleId) });
      void qc.invalidateQueries({ queryKey: ['governance-cycles', clientId, 'items', cycleId] });
    },
  });
}

export function useReplaceInstanceAgendaMutation(cycleId: string, instanceId: string) {
  const { authFetch, clientId } = useGovernanceCyclesReadContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) =>
      replaceGovernanceCycleInstanceAgenda(authFetch, cycleId, instanceId, itemIds),
    onSuccess: (data) => {
      qc.setQueryData(
        governanceCyclesKeys.instanceDetail(clientId, cycleId, instanceId),
        data,
      );
      void qc.invalidateQueries({
        queryKey: governanceCyclesKeys.instances(clientId, cycleId),
      });
    },
  });
}

export function usePatchInstanceDecisionsMutation(cycleId: string, instanceId: string) {
  const { authFetch, clientId } = useGovernanceCyclesReadContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      decisions: Array<{
        itemId: string;
        decisionStatus: string;
        decisionReason?: string | null;
      }>,
    ) => patchGovernanceCycleInstanceDecisions(authFetch, cycleId, instanceId, decisions),
    onSuccess: (data) => {
      qc.setQueryData(
        governanceCyclesKeys.instanceDetail(clientId, cycleId, instanceId),
        data,
      );
    },
  });
}

export function useGenerateInstancesMutation(cycleId: string) {
  const { authFetch, clientId } = useGovernanceCyclesReadContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => generateGovernanceCycleInstances(authFetch, cycleId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: governanceCyclesKeys.instances(clientId, cycleId) });
    },
  });
}

export function useSubmitProjectToCycleMutation() {
  const { authFetch, clientId } = useGovernanceCyclesReadContext();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cycleId, projectId }: { cycleId: string; projectId: string }) =>
      submitProjectToGovernanceCycle(authFetch, cycleId, projectId),
    onSuccess: (_d, { projectId }) => {
      void qc.invalidateQueries({
        queryKey: governanceCyclesKeys.byProject(clientId, projectId),
      });
      void qc.invalidateQueries({
        queryKey: projectQueryKeys.sheet(clientId, projectId),
      });
    },
  });
}
