'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { projectQueryKeys } from '@/features/projects/lib/project-query-keys';
import { useProjectTaskBucketsQuery } from '@/features/projects/hooks/use-project-task-buckets-query';
import {
  createProjectTaskBucket,
  deleteProjectTaskBucket,
} from '@/features/projects/api/project-task-buckets.api';
import { Trash2 } from 'lucide-react';

type Props = {
  projectId: string;
};

export function ProjectPlanningBucketsSettings({ projectId }: Props) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  const query = useProjectTaskBucketsQuery(projectId);
  const [name, setName] = useState('');

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.taskBuckets(clientId, projectId),
    });
  }, [qc, clientId, projectId]);

  const createMut = useMutation({
    mutationFn: () =>
      createProjectTaskBucket(authFetch, projectId, { name: name.trim() }),
    onSuccess: () => {
      setName('');
      invalidate();
      toast.success('Bucket ajouté.');
    },
    onError: (e: Error) => toast.error(e.message || 'Création impossible.'),
  });

  const deleteMut = useMutation({
    mutationFn: (bucketId: string) =>
      deleteProjectTaskBucket(authFetch, projectId, bucketId),
    onSuccess: () => {
      invalidate();
      toast.success('Bucket supprimé.');
    },
    onError: (e: Error) => toast.error(e.message || 'Suppression impossible.'),
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const useMs = query.data?.useMicrosoftPlannerBuckets ?? false;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Buckets du planning</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Colonnes Kanban pour classer les tâches (sync Microsoft Planner si vous activez l’option
          dans Microsoft 365).
        </p>
      </div>

      {useMs ? (
        <Alert>
          <AlertTitle>Buckets Microsoft Planner</AlertTitle>
          <AlertDescription>
            Les colonnes de ce projet sont importées depuis le plan Planner lié. Modifiez les
            colonnes dans Teams / Planner ; pour repasser en buckets Starium, désactivez l’option
            dans la configuration Microsoft 365 (bouton Configurer).
          </AlertDescription>
        </Alert>
      ) : null}

      {query.isLoading ? (
        <LoadingState rows={3} />
      ) : query.isError ? (
        <p className="text-destructive text-sm">Impossible de charger les buckets.</p>
      ) : (
        <>
          <ul className="divide-border/60 max-h-[min(40vh,280px)] divide-y overflow-auto rounded-lg border border-border/70">
            {items.length === 0 ? (
              <li className="text-muted-foreground px-3 py-4 text-sm">Aucun bucket pour l’instant.</li>
            ) : (
              items.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate">{b.name}</span>
                  {canEdit && !useMs ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-8 shrink-0"
                      disabled={deleteMut.isPending}
                      onClick={() => deleteMut.mutate(b.id)}
                      aria-label={`Supprimer ${b.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </li>
              ))
            )}
          </ul>

          {canEdit && !useMs ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[12rem] flex-1 space-y-1">
                <label htmlFor="new-bucket-name" className="text-xs font-medium text-muted-foreground">
                  Nouveau bucket
                </label>
                <Input
                  id="new-bucket-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom du bucket"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (name.trim() && !createMut.isPending) createMut.mutate();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                disabled={!name.trim() || createMut.isPending}
                onClick={() => createMut.mutate()}
              >
                Ajouter
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
