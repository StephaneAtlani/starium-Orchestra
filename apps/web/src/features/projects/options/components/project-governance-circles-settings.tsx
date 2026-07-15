'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  createProjectGovernanceCircle,
  deleteProjectGovernanceCircle,
} from '../../api/project-governance-circles.api';
import { useProjectGovernanceCirclesQuery } from '../../hooks/use-project-governance-circles-query';
import { projectQueryKeys } from '../../lib/project-query-keys';
import { governanceCircleDisplayLabel } from '../../components/project-team-governance-circles-field';
import { Trash2 } from 'lucide-react';

type Props = {
  projectId: string;
};

export function ProjectGovernanceCirclesSettings({ projectId }: Props) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();
  const query = useProjectGovernanceCirclesQuery(projectId);
  const [name, setName] = useState('');

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.governanceCircles(clientId, projectId),
    });
    void qc.invalidateQueries({
      queryKey: projectQueryKeys.team(clientId, projectId),
    });
  }, [qc, clientId, projectId]);

  const createMut = useMutation({
    mutationFn: () => createProjectGovernanceCircle(authFetch, projectId, { name: name.trim() }),
    onSuccess: () => {
      setName('');
      invalidate();
      toast.success('Cercle de gouvernance ajouté.');
    },
    onError: (e: Error) => toast.error(e.message || 'Création impossible.'),
  });

  const deleteMut = useMutation({
    mutationFn: (circleId: string) =>
      deleteProjectGovernanceCircle(authFetch, projectId, circleId),
    onSuccess: () => {
      invalidate();
      toast.success('Cercle supprimé.');
    },
    onError: (e: Error) => toast.error(e.message || 'Suppression impossible.'),
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Cercles de gouvernance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Par défaut, chaque projet dispose du{' '}
          <strong>Comité de pilotage (COPIL)</strong> et du{' '}
          <strong>Comité de projet (COPROJ)</strong>. Ajoutez ici d’autres cercles d’appartenance
          pour l’équipe (ex. comité technique, CODIR projet…).
        </p>
      </div>

      {query.isLoading ? (
        <LoadingState rows={3} />
      ) : query.isError ? (
        <p className="text-destructive text-sm">Impossible de charger les cercles.</p>
      ) : (
        <>
          <ul className="divide-border/60 max-h-[min(40vh,320px)] divide-y overflow-auto rounded-lg border border-border/70">
            {items.map((circle) => (
              <li
                key={circle.id}
                className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0 flex flex-col gap-0.5">
                  <span className="truncate font-medium">
                    {governanceCircleDisplayLabel(circle)}
                  </span>
                  {circle.isSystem ? (
                    <Badge variant="secondary" className="w-fit text-[10px]">
                      Cercle système
                    </Badge>
                  ) : null}
                </div>
                {canEdit && !circle.isSystem ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={deleteMut.isPending}
                    aria-label={`Supprimer ${circle.name}`}
                    onClick={() => deleteMut.mutate(circle.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>

          {canEdit ? (
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
              onSubmit={(e) => {
                e.preventDefault();
                const value = name.trim();
                if (!value) return;
                createMut.mutate();
              }}
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Comité technique, CODIR projet…"
                maxLength={200}
                aria-label="Nom du cercle de gouvernance"
              />
              <Button type="submit" disabled={!name.trim() || createMut.isPending}>
                Ajouter un cercle
              </Button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">Lecture seule — pas de modification.</p>
          )}
        </>
      )}
    </div>
  );
}
