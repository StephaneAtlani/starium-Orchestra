'use client';

import {
  Activity,
  Briefcase,
  CheckCircle2,
  Clock3,
  DollarSign,
  type LucideIcon,
} from 'lucide-react';
import { KpiCard, type KpiCardFooterTone } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatPortfolioBudgetCompact,
  portfolioMonthCreationDeltaLabel,
  portfolioPercentOfTotal,
  portfolioQuarterCompletionDeltaLabel,
} from '../lib/projects-list-display';
import type { ProjectsPortfolioSummary } from '../types/project.types';

type KpiCardDef = {
  id: string;
  label: string;
  Icon: LucideIcon;
  iconWrapperClassName: string;
  footerTone: KpiCardFooterTone;
  value: (summary: ProjectsPortfolioSummary | undefined, isLoading: boolean) => string;
  footer: (summary: ProjectsPortfolioSummary | undefined) => string | null;
};

function portfolioBase(summary: ProjectsPortfolioSummary | undefined): number {
  return summary?.totalProjects ?? 0;
}

const KPI_CARDS: KpiCardDef[] = [
  {
    id: 'active',
    label: 'Projets actifs',
    Icon: Briefcase,
    iconWrapperClassName:
      'bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
    footerTone: 'warning',
    value: (summary, isLoading) =>
      isLoading ? '—' : String(summary?.activeProjects ?? 0),
    footer: (summary) =>
      summary
        ? portfolioMonthCreationDeltaLabel(
            summary.projectsCreatedThisMonth,
            summary.projectsCreatedPreviousMonth,
          )
        : null,
  },
  {
    id: 'in-progress',
    label: "En cours d'exécution",
    Icon: Activity,
    iconWrapperClassName: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
    footerTone: 'success',
    value: (summary, isLoading) =>
      isLoading ? '—' : String(summary?.inProgressProjects ?? 0),
    footer: (summary) =>
      summary
        ? portfolioPercentOfTotal(summary.inProgressProjects, portfolioBase(summary))
        : null,
  },
  {
    id: 'late',
    label: 'En retard',
    Icon: Clock3,
    iconWrapperClassName: 'bg-destructive/10 text-destructive',
    footerTone: 'danger',
    value: (summary, isLoading) =>
      isLoading ? '—' : String(summary?.lateProjects ?? 0),
    footer: (summary) =>
      summary
        ? portfolioPercentOfTotal(summary.lateProjects, portfolioBase(summary))
        : null,
  },
  {
    id: 'completed-quarter',
    label: 'Terminés ce trimestre',
    Icon: CheckCircle2,
    iconWrapperClassName: 'bg-violet-500/12 text-violet-700 dark:text-violet-400',
    footerTone: 'violet',
    value: (summary, isLoading) =>
      isLoading ? '—' : String(summary?.completedThisQuarter ?? 0),
    footer: (summary) =>
      summary
        ? portfolioQuarterCompletionDeltaLabel(
            summary.completedThisQuarter,
            summary.completedPreviousQuarter,
          )
        : null,
  },
  {
    id: 'budget',
    label: 'Budget total',
    Icon: DollarSign,
    iconWrapperClassName: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
    footerTone: 'info',
    value: (summary, isLoading) =>
      isLoading ? '—' : formatPortfolioBudgetCompact(summary?.totalTargetBudgetAmount),
    footer: (summary) => {
      if (!summary?.totalConsumedBudgetAmount) return null;
      return `Consommé : ${formatPortfolioBudgetCompact(summary.totalConsumedBudgetAmount)}`;
    },
  },
];

type Props = {
  summary: ProjectsPortfolioSummary | undefined;
  isLoading: boolean;
};

function KpiCardSkeleton() {
  return (
    <div className="starium-kpi-card !p-4">
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3 w-full max-w-[5.5rem]" />
          <Skeleton className="h-7 w-10" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

/** Synthèse portefeuille — 5 score cards alignées mockup (`KpiCard` dense). */
export function ProjectsPortfolioKpi({ summary, isLoading }: Props) {
  if (isLoading && !summary) {
    return (
      <section className="starium-module" data-testid="projects-portfolio-kpi">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 sm:gap-3">
          {KPI_CARDS.map((card) => (
            <KpiCardSkeleton key={card.id} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="starium-module" data-testid="projects-portfolio-kpi">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 sm:gap-3">
        {KPI_CARDS.map((card) => {
          const footer = card.footer(summary);
          return (
            <KpiCard
              key={card.id}
              variant="dense"
              iconShape="circle"
              title={card.label}
              value={card.value(summary, isLoading)}
              footer={footer ?? undefined}
              footerTone={card.footerTone}
              iconWrapperClassName={card.iconWrapperClassName}
              icon={<card.Icon aria-hidden />}
            />
          );
        })}
      </div>
    </section>
  );
}
