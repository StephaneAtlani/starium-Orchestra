'use client';

import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectReviewsSummaryResponse } from '../types/project.types';

type ContinuityRow = {
  id: string;
  label: string;
  hint: string;
  value: number;
  Icon: LucideIcon;
  iconClassName: string;
};

/**
 * PDF 01/02 — panneau latéral « Continuité du pilotage ».
 */
export function ProjectReviewsContinuityPanel({
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
      <aside
        className="rounded-[var(--radius-lg)] border border-border/70 bg-card p-4 shadow-[var(--shadow-1)]"
        aria-busy="true"
        aria-label="Chargement continuité du pilotage"
      >
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-[var(--radius-md)]" />
          ))}
        </div>
      </aside>
    );
  }

  if (isError || !summary) {
    return (
      <aside
        className="rounded-[var(--radius-lg)] border border-border/70 bg-card p-4 shadow-[var(--shadow-1)]"
        role="alert"
      >
        <p className="text-sm text-destructive">
          Impossible de charger la continuité du pilotage.
        </p>
      </aside>
    );
  }

  const rows: ContinuityRow[] = [
    {
      id: 'actions',
      label: 'Actions ouvertes reportées',
      hint: 'reprises au prochain COPROJ',
      value: summary.openActionsFromReviews,
      Icon: ListChecks,
      iconClassName: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
    },
    {
      id: 'deferred',
      label: 'Sujets reportés',
      hint: 'rattachés à une occurrence cible',
      value: summary.deferredAgendaItemsCount ?? 0,
      Icon: Clock3,
      iconClassName:
        'bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
    },
    {
      id: 'decisions',
      label: 'Décisions COPIL à appliquer',
      hint: 'redescendues vers le COPROJ',
      value: summary.copilDecisionsToApply,
      Icon: CheckCircle2,
      iconClassName: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
    },
    {
      id: 'escalations',
      label: 'Sujets remontés au COPIL',
      hint: 'en attente d’arbitrage',
      value: summary.escalationsPendingCount ?? 0,
      Icon: ArrowUpRight,
      iconClassName: 'bg-violet-500/12 text-violet-700 dark:text-violet-400',
    },
  ];

  return (
    <aside
      className="rounded-[var(--radius-lg)] border border-border/70 bg-card p-4 shadow-[var(--shadow-1)] sm:p-5"
      aria-label="Continuité du pilotage"
      data-testid="project-reviews-continuity"
    >
      <h2 className="mb-4 text-sm font-bold text-foreground sm:text-base">
        Continuité du pilotage
      </h2>
      <ul className="divide-y divide-border/60">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${row.iconClassName}`}
              aria-hidden
            >
              <row.Icon className="size-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug text-foreground">
                {row.label}
              </p>
              <p className="starium-text-muted text-xs leading-snug">{row.hint}</p>
            </div>
            <span className="shrink-0 text-lg font-extrabold tabular-nums text-foreground">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
