'use client';

import type { ProjectsPortfolioSummary } from '../types/project.types';

type Props = {
  summary: ProjectsPortfolioSummary | undefined;
  isLoading: boolean;
};

function KpiCard({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: number;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {isLoading ? '—' : value}
      </p>
    </div>
  );
}

export function ProjectsPortfolioKpi({ summary, isLoading }: Props) {
  const s = summary;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-9">
      <KpiCard label="Projets" value={s?.totalProjects ?? 0} isLoading={isLoading} />
      <KpiCard label="En cours" value={s?.inProgressProjects ?? 0} isLoading={isLoading} />
      <KpiCard label="Terminés" value={s?.completedProjects ?? 0} isLoading={isLoading} />
      <KpiCard label="En retard" value={s?.lateProjects ?? 0} isLoading={isLoading} />
      <KpiCard label="Critiques" value={s?.criticalProjects ?? 0} isLoading={isLoading} />
      <KpiCard label="Bloqués" value={s?.blockedProjects ?? 0} isLoading={isLoading} />
      <KpiCard label="Sans risque" value={s?.noRiskProjects ?? 0} isLoading={isLoading} />
      <KpiCard label="Sans owner" value={s?.noOwnerProjects ?? 0} isLoading={isLoading} />
      <KpiCard label="Sans jalons" value={s?.noMilestoneProjects ?? 0} isLoading={isLoading} />
    </div>
  );
}
