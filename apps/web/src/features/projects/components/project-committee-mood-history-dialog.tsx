'use client';

import Link from 'next/link';
import { AlertCircle, CloudSun, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { cn } from '@/lib/utils';
import {
  PROJECT_REVIEW_STATUS_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
} from '../constants/project-enum-labels';
import { projectPointsTab } from '../constants/project-routes';
import { useProjectCommitteeMoodHistoryQuery } from '../hooks/use-project-committee-mood-history-query';
import { formatProjectDateLong } from '../lib/projects-list-display';
import {
  committeeMoodDisplay,
  type CommitteeMoodKey,
} from '../lib/project-committee-mood-display';

type Props = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProjectCommitteeMoodHistoryDialog({
  projectId,
  open,
  onOpenChange,
}: Props) {
  const historyQuery = useProjectCommitteeMoodHistoryQuery(projectId, { enabled: open });
  const items = historyQuery.data?.items ?? [];

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Historique météo du comité"
      description="Météos renseignées lors des points projet, du plus récent au plus ancien."
      icon={CloudSun}
      size="md"
      footer={
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Fermer
        </Button>
      }
    >
      {historyQuery.isLoading ? (
        <LoadingState rows={4} />
      ) : historyQuery.error ? (
        <Alert variant="destructive" className="border-destructive/40">
          <AlertCircle aria-hidden />
          <AlertTitle>Historique indisponible</AlertTitle>
          <AlertDescription>
            Impossible de charger l&apos;historique. Réessayez plus tard.
          </AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune météo enregistrée"
          description="La météo du comité apparaît ici dès qu’elle est renseignée sur un point projet (onglet Clôture)."
        />
      ) : (
        <ol className="space-y-2" aria-label="Historique météo du comité">
          {items.map((entry, index) => {
            const display = committeeMoodDisplay(entry.committeeMood as CommitteeMoodKey);
            const typeLabel =
              PROJECT_REVIEW_TYPE_LABEL[entry.reviewType] ?? entry.reviewType;
            const statusLabel =
              PROJECT_REVIEW_STATUS_LABEL[entry.status] ?? entry.status;
            const title = entry.title?.trim() || typeLabel;
            const reviewHref = `${projectPointsTab(projectId)}&openReview=${entry.reviewId}`;

            return (
              <li key={entry.reviewId}>
                <Link
                  href={reviewHref}
                  className={cn(
                    'group flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 transition-colors',
                    'hover:border-border hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  {display ? (
                    <span
                      className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-xl',
                        display.iconWrap,
                      )}
                      aria-hidden
                    >
                      <display.Icon className="size-5" strokeWidth={1.75} />
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cn('text-sm font-semibold', display?.valueClassName)}>
                        {display?.label ?? entry.committeeMood}
                      </span>
                      {index === 0 ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Actuelle
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabel}
                      {' · '}
                      {statusLabel}
                      {entry.reviewDate ? (
                        <>
                          {' · '}
                          <time dateTime={entry.reviewDate}>
                            {formatProjectDateLong(entry.reviewDate)}
                          </time>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <ExternalLink
                    className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden
                  />
                  <span className="sr-only">Ouvrir le point projet</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </StariumModal>
  );
}
