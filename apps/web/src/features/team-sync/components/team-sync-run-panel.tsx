'use client';

import { Button } from '@/components/ui/button';
import type { DirectorySyncExecution, DirectorySyncPreview } from '../types/team-sync.types';
import { TeamSyncPreviewTable } from './team-sync-preview-table';

type Props = {
  selectedConnectionId?: string | null;
  preview: DirectorySyncPreview | null;
  execution: DirectorySyncExecution | null;
  loadingPreview?: boolean;
  loadingExecute?: boolean;
  onPreview: () => void;
  onExecute: () => void;
};

export function TeamSyncRunPanel({
  selectedConnectionId,
  preview,
  execution,
  loadingPreview,
  loadingExecute,
  onPreview,
  onExecute,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onPreview}
          disabled={!selectedConnectionId || loadingPreview}
        >
          Prévisualiser
        </Button>
        <Button
          type="button"
          onClick={onExecute}
          disabled={!selectedConnectionId || loadingExecute}
        >
          Exécuter la synchronisation
        </Button>
      </div>

      <TeamSyncPreviewTable preview={preview} />

      {execution && (
        <div className="rounded-md border border-border p-4 text-sm">
          <p className="font-medium">Dernière exécution</p>
          <p className="text-muted-foreground">
            Job {execution.jobId} · {execution.status}
          </p>
          <p className="mt-2">
            {execution.createdCount} créés · {execution.updatedCount} mis à jour ·{' '}
            {execution.deactivatedCount} désactivés
          </p>
        </div>
      )}
    </div>
  );
}
