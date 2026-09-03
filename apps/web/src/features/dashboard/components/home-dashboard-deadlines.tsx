'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import { projectDetail } from '@/features/projects/constants/project-routes';
import { homeDeadlinesList } from '../lib/home-dashboard-routes';

export type HomeDashboardDeadlineItem = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  dateIso: string;
  daysLeft: number;
};

type Props = {
  items: HomeDashboardDeadlineItem[];
  loading?: boolean;
};

export function urgencyTone(daysLeft: number): {
  dot: string;
  badge: string;
} {
  if (daysLeft <= 7) {
    return {
      dot: 'bg-[color:var(--state-danger)]',
      badge:
        'bg-[color:var(--state-danger-bg)] text-[color:var(--state-danger)]',
    };
  }
  if (daysLeft <= 14) {
    return {
      dot: 'bg-[color:var(--state-warning)]',
      badge:
        'bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning)]',
    };
  }
  return {
    dot: 'bg-[color:var(--state-info)]',
    badge: 'bg-[color:var(--state-info-bg)] text-[color:var(--state-info)]',
  };
}

export function formatDeadlineShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '—';
  }
}

export function formatDeadlineLongDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function HomeDashboardDeadlineRow({
  item,
  dense = false,
}: {
  item: HomeDashboardDeadlineItem;
  dense?: boolean;
}) {
  const tone = urgencyTone(item.daysLeft);
  return (
    <Link
      href={projectDetail(item.projectId)}
      className={cn(
        'flex items-start gap-3 rounded-lg transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        dense ? 'px-2 py-2.5' : 'min-h-11 px-3 py-3 sm:min-h-0',
      )}
    >
      <span
        className={cn('mt-1.5 size-2 shrink-0 rounded-full', tone.dot)}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {displayLabel(item.title, 'Échéance')}
        </p>
        <p className="starium-text-muted truncate text-xs">
          {displayLabel(item.projectName, 'Projet')} ·{' '}
          {dense
            ? formatDeadlineShortDate(item.dateIso)
            : formatDeadlineLongDate(item.dateIso)}
        </p>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums',
          tone.badge,
        )}
      >
        {item.daysLeft <= 0 ? 'Échu' : `${item.daysLeft} j`}
      </span>
    </Link>
  );
}

export function HomeDashboardDeadlines({ items, loading }: Props) {
  return (
    <section
      className="starium-section flex h-full flex-col gap-3"
      aria-labelledby="home-deadlines-heading"
    >
      <h2 id="home-deadlines-heading" className="starium-section-title text-base">
        Prochaines échéances
      </h2>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune échéance proche"
          description="Les prochains jalons de vos projets apparaîtront ici."
          className="py-6"
        />
      ) : (
        <ul className="space-y-1" aria-live="polite">
          {items.map((item) => (
            <li key={item.id}>
              <HomeDashboardDeadlineRow item={item} dense />
            </li>
          ))}
        </ul>
      )}

      <Link
        href={homeDeadlinesList()}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'mt-auto min-h-11 w-full justify-center sm:min-h-9',
        )}
      >
        Voir toutes les échéances
      </Link>
    </section>
  );
}
