'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ProjectsPortfolioSummary } from '../types/project.types';

type ValueTone = 'default' | 'ok' | 'warn' | 'danger' | 'muted';

const valueToneClass: Record<ValueTone, string> = {
  default: '',
  ok: 'starium-kpi-strip-item-value--ok',
  warn: 'starium-kpi-strip-item-value--warn',
  danger: 'starium-kpi-strip-item-value--danger',
  muted: 'starium-kpi-strip-item-value--muted',
};

type PortfolioKpiKey = keyof Pick<
  ProjectsPortfolioSummary,
  | 'totalProjects'
  | 'inProgressProjects'
  | 'completedProjects'
  | 'lateProjects'
  | 'criticalProjects'
  | 'blockedProjects'
  | 'noRiskProjects'
  | 'noOwnerProjects'
  | 'noMilestoneProjects'
>;

type KpiItemDef = {
  key: PortfolioKpiKey;
  label: string;
  title?: string;
  tone: ValueTone;
};

type KpiGroupDef = {
  label: string;
  items: KpiItemDef[];
};

const KPI_GROUPS: KpiGroupDef[] = [
  {
    label: 'Volume',
    items: [
      { key: 'totalProjects', label: 'Total', tone: 'default' },
      { key: 'inProgressProjects', label: 'En cours', tone: 'warn' },
      { key: 'completedProjects', label: 'Terminés', tone: 'ok' },
    ],
  },
  {
    label: 'Risques & Échéances',
    items: [
      { key: 'lateProjects', label: 'En retard', tone: 'warn' },
      { key: 'criticalProjects', label: 'Critiques', tone: 'danger' },
      { key: 'blockedProjects', label: 'Bloqués', tone: 'danger' },
    ],
  },
  {
    label: 'Complétude',
    items: [
      {
        key: 'noRiskProjects',
        label: 'Sans étude risque',
        title: 'Aucune étude de risque enregistrée',
        tone: 'warn',
      },
      {
        key: 'noOwnerProjects',
        label: 'Sans resp.',
        title: 'Sans chef de projet ou responsable',
        tone: 'danger',
      },
      { key: 'noMilestoneProjects', label: 'Sans jalons', tone: 'muted' },
    ],
  },
];

type Props = {
  summary: ProjectsPortfolioSummary | undefined;
  isLoading: boolean;
};

function KpiItem({
  label,
  valueStr,
  title,
  tone,
}: {
  label: string;
  valueStr: string;
  title?: string;
  tone: ValueTone;
}) {
  return (
    <div>
      <div className="starium-kpi-strip-item-label">{label}</div>
      <div
        className={cn('starium-kpi-strip-item-value', valueToneClass[tone])}
        title={title}
      >
        {valueStr}
      </div>
    </div>
  );
}

function KpiStripSkeleton() {
  return (
    <div className="starium-kpi-strip" data-testid="projects-portfolio-kpi">
      <div className="starium-kpi-strip-grid">
        {KPI_GROUPS.map((group) => (
          <div key={group.label} className="starium-kpi-strip-group">
            <Skeleton className="mb-4 h-2.5 w-20" />
            <div className="starium-kpi-strip-items">
              {group.items.map((item) => (
                <div key={item.key} className="space-y-1.5">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-8 w-10" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Synthèse portefeuille — une carte, 3 groupes (mockup Projets-Starium).
 */
export function ProjectsPortfolioKpi({ summary, isLoading }: Props) {
  const valueFor = (key: PortfolioKpiKey) => {
    if (isLoading) return '—';
    return String(summary?.[key] ?? 0);
  };

  if (isLoading && !summary) {
    return <KpiStripSkeleton />;
  }

  return (
    <section className="starium-kpi-strip" data-testid="projects-portfolio-kpi">
      <div className="starium-kpi-strip-grid">
        {KPI_GROUPS.map((group) => (
          <div key={group.label} className="starium-kpi-strip-group">
            <div className="starium-kpi-strip-group-label">{group.label}</div>
            <div className="starium-kpi-strip-items">
              {group.items.map((item) => (
                <KpiItem
                  key={item.key}
                  label={item.label}
                  title={item.title}
                  valueStr={valueFor(item.key)}
                  tone={item.tone}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
