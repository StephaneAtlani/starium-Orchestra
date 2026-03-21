'use client';

import type { ReactNode } from 'react';
import { KpiCard } from '@/components/ui/kpi-card';
import type { ProjectsPortfolioSummary } from '../types/project.types';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  FolderKanban,
  MapPinOff,
  PlayCircle,
  ShieldQuestion,
  UserRoundX,
} from 'lucide-react';

type Props = {
  summary: ProjectsPortfolioSummary | undefined;
  isLoading: boolean;
};

function val(n: number | undefined, loading: boolean) {
  if (loading) return '—';
  return String(n ?? 0);
}

function KpiSection({
  sectionId,
  label,
  children,
}: {
  sectionId: string;
  label: string;
  children: ReactNode;
}) {
  const headingId = `projects-kpi-${sectionId}`;
  return (
    <section className="space-y-2" aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{children}</div>
    </section>
  );
}

/**
 * Grille KPI portefeuille — groupes lisibles (volume / risques / complétude).
 * Utilise {@link KpiCard} en variant `dense` (design system §21 / §30.3).
 */
export function ProjectsPortfolioKpi({ summary, isLoading }: Props) {
  const s = summary;
  const loading = isLoading;

  return (
    <div className="space-y-5" data-testid="projects-portfolio-kpi">
      <KpiSection sectionId="volume" label="Volume">
        <KpiCard
          variant="dense"
          title="Projets"
          value={val(s?.totalProjects, loading)}
          icon={<FolderKanban aria-hidden />}
        />
        <KpiCard
          variant="dense"
          title="En cours"
          value={val(s?.inProgressProjects, loading)}
          icon={<PlayCircle aria-hidden />}
        />
        <KpiCard
          variant="dense"
          title="Terminés"
          value={val(s?.completedProjects, loading)}
          icon={<CheckCircle2 aria-hidden />}
        />
      </KpiSection>

      <KpiSection sectionId="risks" label="Risques & échéances">
        <KpiCard
          variant="dense"
          title="En retard"
          value={val(s?.lateProjects, loading)}
          icon={<Clock aria-hidden />}
        />
        <KpiCard
          variant="dense"
          title="Critiques"
          value={val(s?.criticalProjects, loading)}
          icon={<AlertTriangle aria-hidden />}
        />
        <KpiCard
          variant="dense"
          title="Bloqués"
          value={val(s?.blockedProjects, loading)}
          icon={<Ban aria-hidden />}
        />
      </KpiSection>

      <KpiSection sectionId="completeness" label="Complétude">
        <KpiCard
          variant="dense"
          title="Sans risque identifié"
          value={val(s?.noRiskProjects, loading)}
          icon={<ShieldQuestion aria-hidden />}
        />
        <KpiCard
          variant="dense"
          title="Sans responsable"
          value={val(s?.noOwnerProjects, loading)}
          icon={<UserRoundX aria-hidden />}
        />
        <KpiCard
          variant="dense"
          title="Sans jalons"
          value={val(s?.noMilestoneProjects, loading)}
          icon={<MapPinOff aria-hidden />}
        />
      </KpiSection>
    </div>
  );
}
