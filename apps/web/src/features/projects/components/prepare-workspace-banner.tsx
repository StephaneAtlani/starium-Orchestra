'use client';

import { projectReviewTypeBadge } from '../constants/project-enum-labels';
import { displayLabel } from '@/lib/display-label';

type Props = {
  title: string | null;
  reviewType: string;
  reviewDate: string | null;
};

function partsFromIso(iso: string | null): {
  day: string;
  month: string;
  time: string;
} {
  if (!iso) {
    return { day: '—', month: '—', time: '—' };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { day: '—', month: '—', time: '—' };
  }
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d
      .toLocaleDateString('fr-FR', { month: 'short' })
      .replace('.', '')
      .toUpperCase(),
    time: d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export function PrepareWorkspaceBanner({
  title,
  reviewType,
  reviewDate,
}: Props) {
  const { day, month, time } = partsFromIso(reviewDate);
  const badge = projectReviewTypeBadge(reviewType);

  return (
    <div className="prepare-workspace__banner">
      <div className="prepare-workspace__date-tile" aria-hidden={false}>
        <span className="prepare-workspace__date-day">{day}</span>
        <span className="prepare-workspace__date-month">{month}</span>
        <span className="prepare-workspace__date-time">{time}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-extrabold text-foreground">
            {displayLabel(title, 'Point sans titre')}
          </h3>
          <span className="inline-flex rounded-[var(--radius-pill)] bg-[color:var(--brand-ink)] px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white">
            {badge}
          </span>
        </div>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          Préparation de l&apos;instance
        </p>
      </div>
    </div>
  );
}
