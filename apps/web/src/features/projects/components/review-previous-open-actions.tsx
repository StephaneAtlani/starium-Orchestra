'use client';

import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { TASK_STATUS_LABEL } from '../constants/project-enum-labels';
import type { ProjectReviewActionItemApi } from '../types/project.types';

function isOpenPreviousAction(action: ProjectReviewActionItemApi): boolean {
  return action.status !== 'DONE' && action.status !== 'CANCELLED';
}

export function normalizeActionTitle(title: string): string {
  return title.trim().toLocaleLowerCase('fr');
}

export function ReviewPreviousOpenActions({
  actions,
  loading,
  error,
  canResume,
  resumedTitles,
  onResume,
}: {
  actions: ProjectReviewActionItemApi[] | null;
  loading: boolean;
  error: boolean;
  canResume: boolean;
  resumedTitles: string[];
  onResume: (action: ProjectReviewActionItemApi) => void;
}) {
  const openActions = (actions ?? []).filter(isOpenPreviousAction);
  const resumed = new Set(resumedTitles.map(normalizeActionTitle));

  return (
    <section aria-labelledby="review-previous-open-actions" className="min-w-0">
      <h2 id="review-previous-open-actions" className="text-sm font-semibold text-foreground">
        Suivi des actions ouvertes
      </h2>
      {loading ? (
        <LoadingState rows={2} />
      ) : error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          Impossible de charger le point précédent.
        </p>
      ) : openActions.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Aucune action ouverte sur le point précédent.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {openActions.map((action) => {
            const already = resumed.has(normalizeActionTitle(action.title));
            const statusLabel = TASK_STATUS_LABEL[action.status] ?? 'Action';
            return (
              <li
                key={action.id}
                className="flex min-w-0 flex-col gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{statusLabel}</p>
                </div>
                {canResume ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 shrink-0"
                    disabled={already}
                    onClick={() => onResume(action)}
                  >
                    {already ? 'Déjà reprise' : 'Reprendre dans ce point'}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
