'use client';

import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarClock, Gavel, ListChecks, PieChart } from 'lucide-react';
import type { ProjectReviewsSummaryResponse } from '../types/project.types';
import { PROJECT_REVIEW_TYPE_LABEL } from '../constants/project-enum-labels';
import { formatProjectDateTimeFr } from '../lib/projects-list-display';
import { displayLabel } from '@/lib/display-label';

export function ProjectReviewsKpiRow({
  summary,
  isLoading,
  isError,
}: {
  summary: ProjectReviewsSummaryResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-busy="true"
        aria-label="Chargement des indicateurs"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[5.5rem] w-full rounded-[var(--radius-lg)]" />
        ))}
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Impossible de charger les indicateurs des points projet.
      </p>
    );
  }

  const next = summary.nextReview;
  const nextValue = next
    ? formatProjectDateTimeFr(next.reviewDate)
    : 'Aucun';
  const nextFooter = next
    ? displayLabel(
        next.title?.trim() ||
          PROJECT_REVIEW_TYPE_LABEL[next.reviewType] ||
          null,
        'Point planifié',
      )
    : 'Pas de séance à venir';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        variant="dense"
        title="Prochain point"
        value={nextValue}
        footer={nextFooter}
        icon={<CalendarClock className="size-4" aria-hidden />}
      />
      <KpiCard
        variant="dense"
        title="Volume trimestre"
        value={String(summary.quarterVolume)}
        footer="Points datés ce trimestre"
        icon={<PieChart className="size-4" aria-hidden />}
      />
      <KpiCard
        variant="dense"
        title="Actions issues"
        value={String(summary.openActionsFromReviews)}
        footer="Actions ouvertes"
        icon={<ListChecks className="size-4" aria-hidden />}
      />
      <KpiCard
        variant="dense"
        title="Décisions COPIL"
        value={String(summary.copilDecisionsToApply)}
        footer="À appliquer (CR finalisés)"
        icon={<Gavel className="size-4" aria-hidden />}
      />
    </div>
  );
}
