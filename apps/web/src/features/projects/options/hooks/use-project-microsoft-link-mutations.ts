'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import { updateProjectMicrosoftLink } from '../api/update-project-microsoft-link';
import { triggerTasksSync } from '../api/trigger-tasks-sync';
import { triggerDocumentsSync } from '../api/trigger-documents-sync';
import {
  resolveProjectMicrosoftTeamsProvisioning,
  retryProjectMicrosoftTeamsProvisioning,
  startProjectMicrosoftTeamsProvisioning,
} from '../api/project-microsoft-teams-provisioning';
import { projectOptionsKeys } from '../lib/project-options-query-keys';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import type {
  ResolveProjectMicrosoftTeamsProvisioningPayload,
  UpdateProjectMicrosoftLinkPayload,
} from '../types/project-options.types';

export function useUpdateProjectMicrosoftLinkMutation(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateProjectMicrosoftLinkPayload) =>
      updateProjectMicrosoftLink(authFetch, projectId, body),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: projectOptionsKeys.microsoftLink(clientId, projectId) }),
        qc.invalidateQueries({
          queryKey: projectOptionsKeys.microsoftProvisioning(clientId, projectId),
        }),
        qc.invalidateQueries({ queryKey: projectQueryKeys.detail(clientId, projectId) }),
        qc.invalidateQueries({ queryKey: projectQueryKeys.taskBuckets(clientId, projectId) }),
        qc.invalidateQueries({ queryKey: projectQueryKeys.taskLabels(clientId, projectId) }),
      ]);
      toast.success('Configuration Microsoft enregistrée.');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Enregistrement impossible.');
    },
  });
}

export function useTriggerTasksSyncMutation(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => triggerTasksSync(authFetch, projectId),
    onSuccess: async (result) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: projectOptionsKeys.microsoftLink(clientId, projectId) }),
        qc.invalidateQueries({
          queryKey: projectOptionsKeys.microsoftProvisioning(clientId, projectId),
        }),
        qc.invalidateQueries({ queryKey: projectQueryKeys.tasks(clientId, projectId) }),
        qc.invalidateQueries({ queryKey: projectQueryKeys.taskLabels(clientId, projectId) }),
      ]);
      if (result.status === 'success') {
        toast.success(
          `Sync tâches OK: ${result.summary.syncedToPlanner} poussées, ${result.summary.updatedInStarium} mises à jour, ${result.summary.createdInStarium} créées.`,
        );
      } else {
        toast.error(
          `Sync tâches en échec: ${result.summary.errors} erreur(s), ${result.summary.conflictsResolvedByStarium} conflit(s) résolu(s).`,
        );
      }
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Échec de la synchronisation des tâches.');
    },
  });
}

export function useTriggerDocumentsSyncMutation(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => triggerDocumentsSync(authFetch, projectId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: projectOptionsKeys.microsoftLink(clientId, projectId) }),
        qc.invalidateQueries({
          queryKey: projectOptionsKeys.microsoftProvisioning(clientId, projectId),
        }),
        qc.invalidateQueries({ queryKey: projectQueryKeys.documents(clientId, projectId) }),
      ]);
      toast.success('Synchronisation des documents terminée.');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Échec de la synchronisation des documents.');
    },
  });
}

export function useStartProjectMicrosoftTeamsProvisioningMutation(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => startProjectMicrosoftTeamsProvisioning(authFetch, projectId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: projectOptionsKeys.microsoftProvisioning(clientId, projectId),
        }),
        qc.invalidateQueries({ queryKey: projectOptionsKeys.microsoftLink(clientId, projectId) }),
      ]);
      toast.success('Provisioning Teams lancé.');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Impossible de lancer le provisioning Teams.');
    },
  });
}

export function useRetryProjectMicrosoftTeamsProvisioningMutation(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (provisioningId: string) =>
      retryProjectMicrosoftTeamsProvisioning(authFetch, projectId, provisioningId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: projectOptionsKeys.microsoftProvisioning(clientId, projectId),
        }),
        qc.invalidateQueries({ queryKey: projectOptionsKeys.microsoftLink(clientId, projectId) }),
      ]);
      toast.success('Retry Teams relancé.');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Impossible de relancer le provisioning Teams.');
    },
  });
}

export function useResolveProjectMicrosoftTeamsProvisioningMutation(projectId: string) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      provisioningId,
      body,
    }: {
      provisioningId: string;
      body: ResolveProjectMicrosoftTeamsProvisioningPayload;
    }) =>
      resolveProjectMicrosoftTeamsProvisioning(
        authFetch,
        projectId,
        provisioningId,
        body,
      ),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: projectOptionsKeys.microsoftProvisioning(clientId, projectId),
        }),
        qc.invalidateQueries({ queryKey: projectOptionsKeys.microsoftLink(clientId, projectId) }),
      ]);
      toast.success('Provisioning Teams résolu.');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Impossible de résoudre le provisioning Teams.');
    },
  });
}
