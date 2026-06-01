'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  archiveGovernanceCycle,
  restoreGovernanceCycle,
  createGovernanceCycle,
  createGovernanceCycleItem,
  deleteGovernanceCycleItem,
  getApiErrorMessage,
  patchGovernanceCycleItemArbitration,
  patchGovernanceCycleItemEdition,
  updateGovernanceCycle,
} from './governance-cycles.api';
import { governanceCyclesKeys } from '../lib/governance-cycles-query-keys';
import type {
  CreateGovernanceCycleFormValues,
  CreateGovernanceCycleItemFormValues,
  PatchGovernanceCycleItemArbitrationFormValues,
  PatchGovernanceCycleItemEditionFormValues,
  UpdateGovernanceCycleFormValues,
} from '../schemas/governance-cycle.schemas';
import {
  createGovernanceCycleItemSchema,
  patchGovernanceCycleItemArbitrationSchema,
  patchGovernanceCycleItemEditionSchema,
} from '../schemas/governance-cycle.schemas';

function buildCreateItemPayload(values: CreateGovernanceCycleItemFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    sourceType: values.sourceType,
  };
  if (values.title?.trim()) payload.title = values.title.trim();
  if (values.description?.trim()) payload.description = values.description.trim();
  if (values.projectId) payload.projectId = values.projectId;
  if (values.budgetId) payload.budgetId = values.budgetId;
  if (values.estimatedBudgetAmount?.trim()) {
    payload.estimatedBudgetAmount = values.estimatedBudgetAmount.trim();
  }
  if (values.estimatedCapacityDays?.trim()) {
    payload.estimatedCapacityDays = values.estimatedCapacityDays.trim();
  }
  if (values.valueScore !== undefined) payload.valueScore = values.valueScore;
  if (values.riskScore !== undefined) payload.riskScore = values.riskScore;
  if (values.budgetScore !== undefined) payload.budgetScore = values.budgetScore;
  if (values.capacityScore !== undefined) payload.capacityScore = values.capacityScore;
  if (values.alignmentScore !== undefined) payload.alignmentScore = values.alignmentScore;
  return payload;
}

export function useCreateGovernanceCycleMutation() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (body: CreateGovernanceCycleFormValues) => createGovernanceCycle(authFetch, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.lists(clientId) });
    },
  });
}

export function useUpdateGovernanceCycleMutation(cycleId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (body: UpdateGovernanceCycleFormValues) =>
      updateGovernanceCycle(authFetch, cycleId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.lists(clientId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.detail(clientId, cycleId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.summary(clientId, cycleId) }),
      ]);
    },
  });
}

export function useArchiveGovernanceCycleMutation() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (cycleId: string) => archiveGovernanceCycle(authFetch, cycleId),
    onSuccess: async (_data, cycleId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.lists(clientId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.detail(clientId, cycleId) }),
      ]);
    },
  });
}

export function useRestoreGovernanceCycleMutation(cycleId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: () => restoreGovernanceCycle(authFetch, cycleId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.lists(clientId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.detail(clientId, cycleId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.summary(clientId, cycleId) }),
      ]);
    },
  });
}

export function useCreateGovernanceCycleItemMutation(cycleId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (values: CreateGovernanceCycleItemFormValues) => {
      const parsed = createGovernanceCycleItemSchema.parse(values);
      return createGovernanceCycleItem(authFetch, cycleId, buildCreateItemPayload(parsed));
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.items(clientId, cycleId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.summary(clientId, cycleId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.detail(clientId, cycleId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.lists(clientId) }),
        queryClient.invalidateQueries({
          queryKey: ['governance-cycles', clientId, 'instances', cycleId],
        }),
      ]);
    },
  });
}

export function usePatchGovernanceCycleItemEditionMutation(cycleId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: ({
      itemId,
      body,
    }: {
      itemId: string;
      body: PatchGovernanceCycleItemEditionFormValues;
    }) => {
      const parsed = patchGovernanceCycleItemEditionSchema.parse(body);
      return patchGovernanceCycleItemEdition(authFetch, cycleId, itemId, parsed);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.items(clientId, cycleId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.summary(clientId, cycleId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.detail(clientId, cycleId) }),
        queryClient.invalidateQueries({
          queryKey: ['governance-cycles', clientId, 'instances', cycleId],
        }),
      ]);
    },
  });
}

export function usePatchGovernanceCycleItemArbitrationMutation(cycleId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: ({
      itemId,
      body,
    }: {
      itemId: string;
      body: PatchGovernanceCycleItemArbitrationFormValues;
    }) => {
      const parsed = patchGovernanceCycleItemArbitrationSchema.parse(body);
      return patchGovernanceCycleItemArbitration(authFetch, cycleId, itemId, parsed);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.items(clientId, cycleId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.summary(clientId, cycleId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.detail(clientId, cycleId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.lists(clientId) }),
        queryClient.invalidateQueries({
          queryKey: ['governance-cycles', clientId, 'instances', cycleId],
        }),
      ]);
    },
  });
}

export function useDeleteGovernanceCycleItemMutation(cycleId: string) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useMutation({
    mutationFn: (itemId: string) => deleteGovernanceCycleItem(authFetch, cycleId, itemId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.items(clientId, cycleId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.summary(clientId, cycleId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.detail(clientId, cycleId) }),
        queryClient.invalidateQueries({ queryKey: governanceCyclesKeys.lists(clientId) }),
      ]);
    },
  });
}

export { getApiErrorMessage };
