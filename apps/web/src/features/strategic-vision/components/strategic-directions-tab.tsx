'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  formatEurCents,
  formatReviewDate,
  stgTone,
} from '@/features/strategic-direction-strategy/lib/strategie-ui';
import '@/features/strategic-direction-strategy/styles/strategie.css';
import { useDeleteStrategicDirectionMutation } from '../hooks/use-strategic-vision-queries';
import type { StrategicDirectionDto } from '../types/strategic-vision.types';
import { StrategicDirectionCreateEditDialog } from './strategic-direction-create-edit-dialog';

export function StrategicDirectionsTab({
  directions,
  directionsQueryState,
  canManageDirections,
  embedded = false,
  onRetry,
}: {
  directions: StrategicDirectionDto[];
  directionsQueryState: { isLoading: boolean; isError: boolean };
  canManageDirections: boolean;
  embedded?: boolean;
  onRetry?: () => void;
}) {
  const deleteDirection = useDeleteStrategicDirectionMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StrategicDirectionDto | null>(null);

  const sorted = useMemo(
    () =>
      [...directions].sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }) ||
          a.code.localeCompare(b.code),
      ),
    [directions],
  );

  if (directionsQueryState.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (directionsQueryState.isError) {
    return (
      <ErrorState
        message="Impossible de charger les directions stratégiques."
        onRetry={onRetry}
      />
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('stg-root', embedded ? 'space-y-4' : 'space-y-4')}>
        {!embedded ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Référentiel directions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Utilisé dans Vision stratégique, objectifs et schémas directeurs.
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex w-full sm:w-auto" />}>
                <Button
                  type="button"
                  className="min-h-11 w-full sm:w-auto"
                  disabled={!canManageDirections}
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="size-4" aria-hidden />
                  Nouvelle direction
                </Button>
              </TooltipTrigger>
              {!canManageDirections ? (
                <TooltipContent>
                  Permission strategic_vision.update ou strategic_vision.manage_directions requise
                </TooltipContent>
              ) : null}
            </Tooltip>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-[12.5px] font-semibold text-muted-foreground">
              {sorted.length} direction{sorted.length > 1 ? 's' : ''}
            </p>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={!canManageDirections}
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="size-4" aria-hidden />
                  Nouvelle direction
                </Button>
              </TooltipTrigger>
              {!canManageDirections ? (
                <TooltipContent>
                  Permission strategic_vision.update ou strategic_vision.manage_directions requise
                </TooltipContent>
              ) : null}
            </Tooltip>
          </div>
        )}

        {sorted.length === 0 ? (
          <EmptyState
            title="Aucune direction"
            description="Créez une direction pour l’affecter aux objectifs et schémas directeurs."
            action={
              canManageDirections ? (
                <Button type="button" className="min-h-11" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" aria-hidden />
                  Nouvelle direction
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="stg-grid">
            {sorted.map((row) => {
              const T = stgTone(row.accentTone);
              return (
                <article key={row.id} className="card stg-card !cursor-default hover:!transform-none">
                  <div className="stg-card-head">
                    <div
                      className="stg-sigle"
                      style={{ background: T.bg, color: T.c }}
                      aria-hidden
                    >
                      {displayLabel(row.code, 'Dir.')}
                    </div>
                    <div className="stg-card-id">
                      <div className="stg-card-name">
                        {displayLabel(row.name, 'Direction')}
                      </div>
                      <div className="stg-card-sub">
                        {firstDisplayLabel(
                          [row.sponsorLabel, row.parentLabel],
                          'Rattachement non renseigné',
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'stg-badge',
                        row.isActive ? 'bdg-success' : 'bdg-neutral',
                      )}
                    >
                      {row.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="stg-card-scope">
                    {displayLabel(row.description, 'Périmètre à préciser')}
                  </p>

                  <div className="stg-mgrid">
                    <div className="stg-mcell">
                      <div className="l">Effectif</div>
                      <div className="v">
                        {row.fteCount != null ? `${row.fteCount} ETP` : '—'}
                      </div>
                    </div>
                    <div className="stg-mcell">
                      <div className="l">Budget</div>
                      <div className="v">
                        {formatEurCents(row.operatingBudgetCents)}
                      </div>
                    </div>
                    <div className="stg-mcell">
                      <div className="l">Ordre</div>
                      <div className="v">{row.sortOrder}</div>
                    </div>
                    <div className="stg-mcell">
                      <div className="l">MAJ</div>
                      <div className="v">{formatReviewDate(row.updatedAt)}</div>
                    </div>
                  </div>

                  <div className="stg-card-foot">
                    <span className="stg-meta">{displayLabel(row.code, 'Code')}</span>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex" />}>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="min-h-11 min-w-11"
                            disabled={!canManageDirections}
                            onClick={() => setEditing(row)}
                            aria-label={`Modifier ${displayLabel(row.name, 'la direction')}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {canManageDirections
                            ? 'Modifier'
                            : 'Permission strategic_vision requise'}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex" />}>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="min-h-11 min-w-11 text-destructive hover:text-destructive"
                            disabled={!canManageDirections || deleteDirection.isPending}
                            onClick={() => {
                              const ok = window.confirm(
                                `Supprimer la direction « ${displayLabel(row.name, 'Direction')} » (${displayLabel(row.code, 'code')}) ? Les objectifs rattachés redeviendront « non affectés ». Impossible si des stratégies de direction existent encore.`,
                              );
                              if (!ok) return;
                              deleteDirection.mutate(row.id, {
                                onSuccess: () => toast.success('Direction supprimée.'),
                                onError: (error) =>
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : 'Suppression impossible.',
                                  ),
                              });
                            }}
                            aria-label={`Supprimer ${displayLabel(row.name, 'la direction')}`}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {canManageDirections
                            ? 'Supprimer'
                            : 'Permission strategic_vision requise'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </article>
              );
            })}

            {canManageDirections ? (
              <button
                type="button"
                className="stg-add min-h-[220px]"
                onClick={() => setCreateOpen(true)}
              >
                <Plus aria-hidden />
                Ajouter une direction
              </button>
            ) : null}
          </div>
        )}

        <StrategicDirectionCreateEditDialog
          mode="create"
          open={createOpen}
          onOpenChange={setCreateOpen}
          direction={null}
        />
        <StrategicDirectionCreateEditDialog
          mode="edit"
          open={editing != null}
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
          direction={editing}
        />
      </div>
    </TooltipProvider>
  );
}
