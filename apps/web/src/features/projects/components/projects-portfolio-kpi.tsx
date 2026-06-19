'use client';

import {
  CheckCircle2,
  Clock3,
  FolderKanban,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectsPortfolioSummary } from '../types/project.types';

type PortfolioKpiKey = keyof Pick<
  ProjectsPortfolioSummary,
  'totalProjects' | 'inProgressProjects' | 'lateProjects' | 'completedProjects'
>;

type KpiCardDef = {
  key: PortfolioKpiKey;
  label: string;
  Icon: LucideIcon;
  iconWrapperClassName: string;
};

const KPI_CARDS: KpiCardDef[] = [
  {
    key: 'totalProjects',
    label: 'Projets actifs',
    Icon: FolderKanban,
    iconWrapperClassName:
      'size-9 rounded-lg bg-[color:var(--starium-primary)]/10 text-[color:var(--starium-primary)]',
  },
  {
    key: 'inProgressProjects',
    label: "En cours d'exécution",
    Icon: TrendingUp,
    iconWrapperClassName:
      'size-9 rounded-lg bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
  },
  {
    key: 'lateProjects',
    label: 'En retard',
    Icon: Clock3,
    iconWrapperClassName: 'size-9 rounded-lg bg-destructive/10 text-destructive',
  },
  {
    key: 'completedProjects',
    label: 'Terminés ce trimestre',
    Icon: CheckCircle2,
    iconWrapperClassName:
      'size-9 rounded-lg bg-[color:var(--state-success)]/10 text-[color:var(--state-success)]',
  },
];

type Props = {
  summary: ProjectsPortfolioSummary | undefined;
  isLoading: boolean;
};

function KpiCardSkeleton() {
  return (
    <div className="starium-kpi-card !p-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-7 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3 w-full max-w-[5.5rem]" />
          <Skeleton className="h-6 w-8" />
        </div>
      </div>
    </div>
  );
}

/**
 * Synthèse portefeuille — 4 score cards DS (`KpiCard` dense).
 */
export function ProjectsPortfolioKpi({ summary, isLoading }: Props) {
  const valueFor = (key: PortfolioKpiKey) => {
    if (isLoading) return '—';
    return String(summary?.[key] ?? 0);
  };

  if (isLoading && !summary) {
    return (
      <section className="starium-module" data-testid="projects-portfolio-kpi">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {KPI_CARDS.map((card) => (
            <KpiCardSkeleton key={card.key} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="starium-module" data-testid="projects-portfolio-kpi">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {KPI_CARDS.map((card) => (
          <KpiCard
            key={card.key}
            variant="dense"
            title={card.label}
            value={valueFor(card.key)}
            iconWrapperClassName={card.iconWrapperClassName}
            icon={<card.Icon aria-hidden />}
          />
        ))}
      </div>
    </section>
  );
}
