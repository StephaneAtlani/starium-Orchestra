'use client';

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Flag,
  Layers,
  PlayCircle,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ProjectsPortfolioSummary } from '../types/project.types';

type ValueTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const valueToneClass: Record<ValueTone, string> = {
  default: 'text-foreground',
  info: 'text-[color:var(--brand-gold-700)]',
  success: 'text-[color:var(--state-success)]',
  warning: 'text-[color:var(--state-warning)]',
  danger: 'text-destructive',
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

const KPI_DEFS: {
  key: PortfolioKpiKey;
  label: string;
  title?: string;
  tone: ValueTone;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { key: 'totalProjects', label: 'Projets', tone: 'info', icon: Layers },
  { key: 'inProgressProjects', label: 'En cours', tone: 'info', icon: PlayCircle },
  { key: 'completedProjects', label: 'Terminés', tone: 'success', icon: CheckCircle2 },
  { key: 'lateProjects', label: 'En retard', tone: 'warning', icon: Clock },
  { key: 'criticalProjects', label: 'Critiques', tone: 'danger', icon: AlertTriangle },
  { key: 'blockedProjects', label: 'Bloqués', tone: 'danger', icon: Ban },
  {
    key: 'noRiskProjects',
    label: 'Sans étude de risque',
    title: 'Aucune étude de risque enregistrée',
    tone: 'warning',
    icon: ShieldAlert,
  },
  {
    key: 'noOwnerProjects',
    label: 'Sans responsable',
    title: 'Sans chef de projet ou responsable',
    tone: 'warning',
    icon: UserX,
  },
  { key: 'noMilestoneProjects', label: 'Sans jalons', tone: 'warning', icon: Flag },
];

type Props = {
  summary: ProjectsPortfolioSummary | undefined;
  isLoading: boolean;
};

function ScoreCard({
  label,
  valueStr,
  title,
  valueTone,
  Icon,
}: {
  label: string;
  valueStr: string;
  title?: string;
  valueTone: ValueTone;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="starium-kpi-card !p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon
          className="size-7 shrink-0 text-[color:var(--brand-gold)]"
          strokeWidth={1.5}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="starium-kpi-label truncate text-[12px] leading-tight">{label}</p>
          <p
            className={cn(
              'starium-kpi-value starium-kpi-value--dense leading-none',
              valueToneClass[valueTone],
            )}
            title={title}
          >
            {valueStr}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScoreCardSkeleton() {
  return (
    <div className="starium-kpi-card !p-3">
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-7 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-6 w-10" />
        </div>
      </div>
    </div>
  );
}

/**
 * Synthèse portefeuille — score cards DS (icône or + libellé + valeur).
 */
export function ProjectsPortfolioKpi({ summary, isLoading }: Props) {
  const valueFor = (key: PortfolioKpiKey) => {
    if (isLoading) return '—';
    return String(summary?.[key] ?? 0);
  };

  return (
    <section className="starium-module space-y-4" data-testid="projects-portfolio-kpi">
      <div className="space-y-1">
        <h2 className="starium-section-title">Indicateurs portefeuille</h2>
        <p className="text-sm text-muted-foreground">
          Synthèse client actif (serveur).
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 min-[960px]:grid-cols-9">
        {isLoading && !summary
          ? KPI_DEFS.map((def) => <ScoreCardSkeleton key={def.key} />)
          : KPI_DEFS.map((def) => {
              const Icon = def.icon;
              return (
                <ScoreCard
                  key={def.key}
                  label={def.label}
                  title={def.title}
                  valueStr={valueFor(def.key)}
                  valueTone={def.tone}
                  Icon={Icon}
                />
              );
            })}
      </div>
    </section>
  );
}
