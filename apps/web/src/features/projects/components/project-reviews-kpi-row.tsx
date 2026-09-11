'use client';

import {
  CalendarDays,
  Clock3,
  ListChecks,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { KpiCard, type KpiCardFooterTone } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  ProjectReviewType,
  ProjectReviewsSummaryResponse,
} from '../types/project.types';
import { projectReviewTypeBadge } from '../constants/project-enum-labels';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Date courte PDF (« 16 mai ») — sans point de mois. */
function formatKpiDayMonthFr(iso: string): string {
  try {
    return new Date(iso)
      .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      .replace(/\./g, '')
      .trim();
  } catch {
    return 'Date inconnue';
  }
}

/** Relatif compact PDF (« dans 1 j »). */
function formatKpiRelativeCompactFr(iso: string, now = new Date()): string {
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

function quarterBreakdownFooter(
  byType: Partial<Record<ProjectReviewType, number>> | undefined,
): string {
  const entries = Object.entries(byType ?? {})
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([type, n]) => ({
      type: type as ProjectReviewType,
      n: n ?? 0,
      badge: projectReviewTypeBadge(type),
    }))
    .sort((a, b) => b.n - a.n || a.badge.localeCompare(b.badge, 'fr'));

  if (entries.length === 0) return 'Aucun point daté';
  return entries
    .slice(0, 3)
    .map((e) => `${e.n} ${e.badge}`)
    .join(' · ');
}

type KpiDef = {
  id: string;
  title: string;
  Icon: LucideIcon;
  iconWrapperClassName: string;
  footerTone: KpiCardFooterTone;
  value: string;
  footer: string;
};

/**
 * PDF écran 01 — 4 score cards dense (pastilles colorées), à l’identique mock :
 * Prochain point · Points ce trimestre · Actions issues des points · Décisions COPIL.
 */
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
      <section
        className="starium-module"
        aria-busy="true"
        aria-label="Chargement des indicateurs"
        data-testid="project-reviews-kpi"
      >
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="starium-kpi-card !p-4">
              <div className="flex items-center gap-3.5">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full max-w-[6rem]" />
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
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
  const overdue = summary.overdueActionsFromReviews ?? 0;
  const actionsCount = summary.openActionsFromReviews;
  const decisionsCount = summary.copilDecisionsToApply;

  const cards: KpiDef[] = [
    {
      id: 'next',
      title: 'Prochain point',
      Icon: Clock3,
      iconWrapperClassName:
        'bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
      footerTone: 'warning',
      value: next ? projectReviewTypeBadge(next.reviewType) : 'Aucun',
      footer: next
        ? `${formatKpiDayMonthFr(next.reviewDate)} · ${formatKpiRelativeCompactFr(next.reviewDate)}`
        : 'Aucune séance à venir',
    },
    {
      id: 'quarter',
      title: 'Points ce trimestre',
      Icon: CalendarDays,
      iconWrapperClassName: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
      footerTone: 'info',
      value: String(summary.quarterVolume),
      footer: quarterBreakdownFooter(summary.quarterVolumeByType),
    },
    {
      id: 'actions',
      title: 'Actions issues des points',
      Icon: ListChecks,
      iconWrapperClassName:
        overdue > 0
          ? 'bg-destructive/10 text-destructive'
          : 'bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
      footerTone: overdue > 0 ? 'danger' : 'muted',
      value: String(actionsCount),
      footer:
        overdue > 0
          ? `${overdue} en retard`
          : actionsCount === 0
            ? 'Aucune action ouverte'
            : 'Aucune en retard',
    },
    {
      id: 'decisions',
      title: 'Décisions COPIL à appliquer',
      Icon: RefreshCw,
      iconWrapperClassName:
        'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
      footerTone: decisionsCount > 0 ? 'success' : 'muted',
      value: String(decisionsCount),
      footer:
        decisionsCount > 0
          ? 'redescendues au COPROJ'
          : 'Aucune descente en attente',
    },
  ];

  return (
    <section
      className="starium-module"
      aria-label="Indicateurs points projet"
      data-testid="project-reviews-kpi"
    >
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <KpiCard
            key={card.id}
            variant="dense"
            iconShape="circle"
            title={card.title}
            value={card.value}
            footer={card.footer}
            footerTone={card.footerTone}
            iconWrapperClassName={card.iconWrapperClassName}
            icon={<card.Icon aria-hidden />}
          />
        ))}
      </div>
    </section>
  );
}
