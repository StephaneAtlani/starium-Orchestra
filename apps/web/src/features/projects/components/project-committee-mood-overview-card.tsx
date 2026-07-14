'use client';

import Link from 'next/link';
import { Calendar, CloudSun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectPointsTab } from '../constants/project-routes';
import { formatProjectDateLong } from '../lib/projects-list-display';
import {
  committeeMoodDisplay,
  type CommitteeMoodKey,
} from '../lib/project-committee-mood-display';
import type { ProjectDetail } from '../types/project.types';

type Props = {
  projectId: string;
  project: Pick<
    ProjectDetail,
    | 'committeeMood'
    | 'committeeMoodReviewId'
    | 'committeeMoodReviewTitle'
    | 'committeeMoodReviewDate'
  >;
  /** Bandeau 2 lignes sur l’aperçu synthèse (défaut). */
  layout?: 'strip' | 'card';
};

export function ProjectCommitteeMoodOverviewCard({
  projectId,
  project,
  layout = 'strip',
}: Props) {
  const mood = project.committeeMood as CommitteeMoodKey | null | undefined;
  const display = committeeMoodDisplay(mood);
  const reviewHref = project.committeeMoodReviewId
    ? `${projectPointsTab(projectId)}&openReview=${project.committeeMoodReviewId}`
    : projectPointsTab(projectId);
  const reviewTitle = project.committeeMoodReviewTitle?.trim() || null;

  if (layout === 'card') {
    return (
      <article className="starium-ov-card h-full">
        <div className="starium-ov-card__head">
          <h2 className="starium-ov-card__title">Météo du comité</h2>
          <span className="starium-ov-card__head-ico" aria-hidden>
            <CloudSun strokeWidth={1.75} />
          </span>
        </div>

        {display ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <span
              className={cn(
                'flex size-16 items-center justify-center rounded-2xl',
                display.iconWrap,
              )}
              aria-hidden
            >
              <display.Icon className="size-8" strokeWidth={1.75} />
            </span>
            <p className={cn('text-2xl font-bold', display.valueClassName)}>{display.label}</p>
            {reviewTitle ? (
              <p className="text-sm text-muted-foreground">
                Point :{' '}
                <span className="font-medium text-foreground">{reviewTitle}</span>
              </p>
            ) : null}
            {project.committeeMoodReviewDate ? (
              <p className="text-xs text-muted-foreground">
                {formatProjectDateLong(project.committeeMoodReviewDate)}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground" role="status">
            Non renseignée — définissez la météo lors d&apos;un point projet (onglet Clôture).
          </p>
        )}

        <Link href={reviewHref} className="starium-ov-btn mt-4">
          <CloudSun strokeWidth={1.75} className="size-3.5 shrink-0" aria-hidden />
          Voir les points projet
        </Link>
      </article>
    );
  }

  return (
    <article className="starium-ov-card starium-ov-card--mood-strip">
      <div className="starium-ov-mood-strip__row">
        <h2 className="starium-ov-mood-strip__title">
          <span className="starium-ov-mood-strip__title-ico" aria-hidden>
            <CloudSun strokeWidth={1.75} />
          </span>
          Météo du comité
        </h2>
        {display ? (
          <div
            className="starium-ov-mood-strip__value"
            role="status"
            aria-label={`Météo du comité : ${display.label}`}
          >
            <span className={cn('starium-ov-mood-strip__value-ico', display.iconWrap)} aria-hidden>
              <display.Icon strokeWidth={1.75} />
            </span>
            <span className={cn('starium-ov-mood-strip__value-label', display.valueClassName)}>
              {display.label}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground" role="status">
            Non renseignée
          </p>
        )}
      </div>

      <div className="starium-ov-mood-strip__row">
        <div className="starium-ov-mood-strip__meta">
          {reviewTitle ? (
            <span>
              Point : <strong>{reviewTitle}</strong>
            </span>
          ) : (
            <span>Définissez la météo lors d&apos;un point projet.</span>
          )}
          {project.committeeMoodReviewDate ? (
            <time
              dateTime={project.committeeMoodReviewDate}
              className="starium-ov-mood-strip__meta-date"
            >
              <Calendar strokeWidth={1.75} className="size-3.5 shrink-0" aria-hidden />
              {formatProjectDateLong(project.committeeMoodReviewDate)}
            </time>
          ) : null}
        </div>
        <Link href={reviewHref} className="starium-ov-btn">
          <CloudSun strokeWidth={1.75} className="size-3.5 shrink-0" aria-hidden />
          Voir les points projet
        </Link>
      </div>
    </article>
  );
}
