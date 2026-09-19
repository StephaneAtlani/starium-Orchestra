'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import {
  listProcedureVersions,
  restoreProcedureVersionToDraft,
} from '../api/procedures.api';
import { procedureQueryKeys } from '../lib/procedure-query-keys';
import type { ProcedureVersionListItem } from '../types/procedure.types';

function formatPublishedAt(iso: string | null): string {
  if (!iso) return 'Date inconnue';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return 'Date inconnue';
  }
}

type Props = {
  procedureId: string;
  clientId: string;
  authFetch: AuthFetch;
  canRestore: boolean;
};

export function ProcedureVersionHistory({
  procedureId,
  clientId,
  authFetch,
  canRestore,
}: Props) {
  const queryClient = useQueryClient();
  const [restoreTarget, setRestoreTarget] =
    useState<ProcedureVersionListItem | null>(null);

  const q = useQuery({
    queryKey: procedureQueryKeys.versions(clientId, procedureId),
    queryFn: () => listProcedureVersions(authFetch, procedureId),
    enabled: Boolean(clientId) && Boolean(procedureId),
  });

  const restoreMut = useMutation({
    mutationFn: (versionId: string) =>
      restoreProcedureVersionToDraft(authFetch, procedureId, versionId),
    onSuccess: async () => {
      toast.success('Brouillon restauré — aucune nouvelle version créée');
      setRestoreTarget(null);
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.all(clientId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div id="pr-hist" className="starium-section p-4">
      <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground">
        Historique
      </p>

      {q.isLoading ? <LoadingState rows={3} /> : null}
      {q.isError ? (
        <ErrorState
          message="Impossible de charger l’historique."
          onRetry={() => void q.refetch()}
        />
      ) : null}

      {q.isSuccess && q.data.items.length === 0 ? (
        <EmptyState
          title="Aucune version publiée"
          description="Publiez la procédure pour créer la première version officielle."
        />
      ) : null}

      {q.isSuccess && q.data.items.length > 0 ? (
        <ul className="flex flex-col gap-2.5" aria-label="Versions publiées">
          {q.data.items.map((row) => {
            const label =
              row.versionLabel ??
              displayLabel(null, 'Version sans numéro');
            return (
              <li
                key={row.id}
                className="flex flex-col gap-1 border-b border-border/60 pb-2.5 last:border-b-0 last:pb-0"
              >
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <b className="min-w-9 font-bold text-foreground tabular-nums">
                    {label}
                  </b>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground">
                      {displayLabel(
                        row.changeSummary,
                        row.isMajor
                          ? 'Publication majeure'
                          : 'Publication',
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {row.isCurrent ? (
                        <span className="starium-ds-badge starium-ds-badge--success text-[10px]">
                          Courante
                        </span>
                      ) : null}
                      {row.isMajor ? (
                        <span className="starium-ds-badge starium-ds-badge--warn text-[10px]">
                          Majeure
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11.5px]">
                      {formatPublishedAt(row.publishedAt)}
                      {row.publishedByLabel
                        ? ` · ${displayLabel(row.publishedByLabel, 'Auteur inconnu')}`
                        : ''}
                    </p>
                  </div>
                </div>
                {canRestore ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn('mt-1 min-h-11 w-full sm:min-h-9')}
                    onClick={() => setRestoreTarget(row)}
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    Restaurer dans le brouillon
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <StariumModal
        open={restoreTarget != null}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null);
        }}
        title="Restaurer dans le brouillon"
        description="Remplace le contenu du brouillon. L’historique publié reste inchangé."
        icon={RotateCcw}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={restoreMut.isPending}
              onClick={() => setRestoreTarget(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={restoreMut.isPending || !restoreTarget}
              aria-busy={restoreMut.isPending}
              onClick={() => {
                if (restoreTarget) restoreMut.mutate(restoreTarget.id);
              }}
            >
              Confirmer la restauration
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Restaurer{' '}
          <strong className="text-foreground tabular-nums">
            {restoreTarget?.versionLabel ?? 'cette version'}
          </strong>{' '}
          dans le brouillon courant ? Aucune nouvelle version ne sera créée.
        </p>
      </StariumModal>
    </div>
  );
}
