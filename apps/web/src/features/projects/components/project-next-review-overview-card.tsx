'use client';

import Link from 'next/link';
import { AlertCircle, CalendarDays, Clock3 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { displayLabel } from '@/lib/display-label';
import { projectReviewTypeBadge } from '../constants/project-enum-labels';
import {
  projectPointsTab,
  projectReviewConduct,
} from '../constants/project-routes';
import { useProjectReviewsSummaryQuery } from '../hooks/use-project-reviews-summary-query';
import {
  formatProjectDateTimeFr,
} from '../lib/projects-list-display';

const DAY_MS = 24 * 60 * 60 * 1000;

function formatRelativeCompactFr(iso: string, now = new Date()): string {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return '';
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const diff = Math.round((startTarget.getTime() - startToday.getTime()) / DAY_MS);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'dans 1 j';
  if (diff > 1) return `dans ${diff} j`;
  if (diff === -1) return 'hier';
  return `il y a ${Math.abs(diff)} j`;
}

export function ProjectNextReviewOverviewCard({ projectId }: { projectId: string }) {
  const summaryQuery = useProjectReviewsSummaryQuery(projectId);
  const next = summaryQuery.data?.nextReview ?? null;
  const typeLabel = next ? projectReviewTypeBadge(next.reviewType) : null;
  const title = next
    ? displayLabel(next.title, typeLabel ?? 'Point projet')
    : null;
  const href = next
    ? projectReviewConduct(projectId, next.id)
    : projectPointsTab(projectId);
  const cta = next
    ? next.uiState === 'to_prepare'
      ? 'Préparer le point'
      : 'Ouvrir le point'
    : 'Voir les points';

  return (
    <article
      aria-labelledby="project-next-review-heading"
      className="starium-ov-card starium-ov-card--split h-full"
    >
      <div className="starium-ov-card__head">
        <h2 id="project-next-review-heading" className="starium-ov-card__title">
          Prochain point
        </h2>
        <span className="starium-ov-card__head-ico" aria-hidden>
          <Clock3 strokeWidth={1.75} />
        </span>
      </div>

      {summaryQuery.isLoading ? (
        <LoadingState rows={2} />
      ) : summaryQuery.isError ? (
        <Alert variant="destructive" className="border-destructive/40">
          <AlertCircle aria-hidden />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Impossible de charger le prochain point pour le moment.
          </AlertDescription>
        </Alert>
      ) : next ? (
        <div className="starium-ov-next-point">
          <p className="starium-ov-next-point__type">{typeLabel}</p>
          <p className="starium-ov-next-point__title">{title}</p>
          <p className="starium-ov-next-point__date">
            <CalendarDays strokeWidth={1.75} aria-hidden />
            <span>
              {formatProjectDateTimeFr(next.reviewDate)}
              {formatRelativeCompactFr(next.reviewDate)
                ? ` · ${formatRelativeCompactFr(next.reviewDate)}`
                : ''}
            </span>
          </p>
          <p className="starium-ov-next-point__meta">
            {next.uiState === 'to_prepare' ? 'À préparer' : 'À venir'}
          </p>
        </div>
      ) : (
        <p className="starium-ov-next-point__empty">
          Aucun point planifié. Ouvrez l’onglet Points pour en créer un.
        </p>
      )}

      <Link href={href} className="starium-ov-btn mt-auto">
        <Clock3 strokeWidth={1.75} className="size-3.5 shrink-0" aria-hidden />
        {cta}
      </Link>
    </article>
  );
}
