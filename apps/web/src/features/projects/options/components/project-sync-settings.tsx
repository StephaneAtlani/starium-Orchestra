'use client';

import { useCallback, useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectMicrosoftLinkQuery } from '../hooks/use-project-microsoft-link-query';
import {
  useTriggerDocumentsSyncMutation,
  useTriggerTasksSyncMutation,
  useUpdateProjectMicrosoftLinkMutation,
} from '../hooks/use-project-microsoft-link-mutations';
import type { ProjectMicrosoftLinkDto } from '../types/project-options.types';
import type { UpdateProjectMicrosoftLinkPayload } from '../types/project-options.types';
import { SyncStatusCard } from './sync-status-card';

function mergeLinkPayload(
  link: ProjectMicrosoftLinkDto,
  patch: Partial<UpdateProjectMicrosoftLinkPayload>,
): UpdateProjectMicrosoftLinkPayload {
  const base: UpdateProjectMicrosoftLinkPayload = {
    isEnabled: link.isEnabled,
    syncTasksEnabled: link.syncTasksEnabled,
    syncDocumentsEnabled: link.syncDocumentsEnabled,
  };
  if (link.isEnabled && link.teamId && link.channelId && link.plannerPlanId) {
    base.teamId = link.teamId;
    base.channelId = link.channelId;
    base.plannerPlanId = link.plannerPlanId;
    if (link.teamName) base.teamName = link.teamName;
    if (link.channelName) base.channelName = link.channelName;
    if (link.plannerPlanTitle) base.plannerPlanTitle = link.plannerPlanTitle;
  }
  if (link.filesDriveId) base.filesDriveId = link.filesDriveId;
  if (link.filesFolderId) base.filesFolderId = link.filesFolderId;
  return { ...base, ...patch };
}

type Props = {
  projectId: string;
};

export function ProjectSyncSettings({ projectId }: Props) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const linkQuery = useProjectMicrosoftLinkQuery(projectId);
  const updateMutation = useUpdateProjectMicrosoftLinkMutation(projectId);
  const tasksSync = useTriggerTasksSyncMutation(projectId);
  const docsSync = useTriggerDocumentsSyncMutation(projectId);

  const link = linkQuery.data ?? null;

  const syncTasksAllowed = useMemo(
    () =>
      Boolean(
        link?.isEnabled &&
          link.syncTasksEnabled &&
          link.plannerPlanId &&
          link.microsoftConnectionId,
      ),
    [link],
  );

  const syncDocsAllowed = useMemo(
    () =>
      Boolean(
        link?.isEnabled &&
          link.syncDocumentsEnabled &&
          link.filesDriveId &&
          link.microsoftConnectionId,
      ),
    [link],
  );

  const setSyncTasks = useCallback(
    (checked: boolean) => {
      if (!link) return;
      updateMutation.mutate(mergeLinkPayload(link, { syncTasksEnabled: checked }));
    },
    [link, updateMutation],
  );

  const setSyncDocs = useCallback(
    (checked: boolean) => {
      if (!link) return;
      updateMutation.mutate(mergeLinkPayload(link, { syncDocumentsEnabled: checked }));
    },
    [link, updateMutation],
  );

  if (linkQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (linkQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          {(linkQuery.error as Error)?.message ?? 'Impossible de charger la configuration.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!link) {
    return (
      <Alert>
        <AlertTitle>Aucune liaison Microsoft</AlertTitle>
        <AlertDescription>
          Créez ou enregistrez une configuration dans l’onglet Microsoft 365 pour activer la
          synchronisation.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <SyncStatusCard lastSyncAt={link.lastSyncAt} />

      <div className="space-y-4 rounded-xl border border-border/70 bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="sync-tasks">Synchroniser les tâches (→ Planner)</Label>
            <p className="text-xs text-muted-foreground">
              Active la synchronisation manuelle ou automatique côté serveur lorsque la liaison est
              valide.
            </p>
          </div>
          <input
            id="sync-tasks"
            type="checkbox"
            role="switch"
            className={cn(
              'size-4 shrink-0 rounded border border-input bg-background accent-primary',
              'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
            checked={link.syncTasksEnabled}
            onChange={(e) => setSyncTasks(e.target.checked)}
            disabled={!canEdit || updateMutation.isPending}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="sync-docs">Synchroniser les documents (→ Drive)</Label>
            <p className="text-xs text-muted-foreground">
              Nécessite un drive configuré dans l’onglet Microsoft.
            </p>
          </div>
          <input
            id="sync-docs"
            type="checkbox"
            role="switch"
            className={cn(
              'size-4 shrink-0 rounded border border-input bg-background accent-primary',
              'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
            checked={link.syncDocumentsEnabled}
            onChange={(e) => setSyncDocs(e.target.checked)}
            disabled={!canEdit || updateMutation.isPending}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={
            !canEdit ||
            !syncTasksAllowed ||
            tasksSync.isPending ||
            docsSync.isPending
          }
          onClick={() => tasksSync.mutate()}
        >
          {tasksSync.isPending ? 'Synchronisation…' : 'Synchroniser les tâches'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={
            !canEdit ||
            !syncDocsAllowed ||
            tasksSync.isPending ||
            docsSync.isPending
          }
          onClick={() => docsSync.mutate()}
        >
          {docsSync.isPending ? 'Synchronisation…' : 'Synchroniser les documents'}
        </Button>
      </div>

      {!link.isEnabled ? (
        <Alert>
          <AlertTitle>Liaison désactivée</AlertTitle>
          <AlertDescription>
            Activez la liaison Microsoft dans l’onglet Microsoft 365 pour lancer des
            synchronisations.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
