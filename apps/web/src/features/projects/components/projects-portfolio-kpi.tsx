'use client';

import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ProjectsPortfolioSummary } from '../types/project.types';

/** Tons des chiffres uniquement (tokens §2 FRONTEND_UI-UX — pas de fond de section). */
type ValueTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const valueToneClass: Record<ValueTone, string> = {
  default: 'text-foreground',
  info: 'text-[color:var(--brand-gold-700)]',
  success: 'text-[color:var(--state-success)]',
  warning: 'text-[color:var(--state-warning)]',
  danger: 'text-destructive',
};

type Props = {
  summary: ProjectsPortfolioSummary | undefined;
  isLoading: boolean;
};

function val(n: number | undefined, loading: boolean) {
  if (loading) return '—';
  return String(n ?? 0);
}

/** Cellule compacte : libellé au-dessus, chiffre en dessous (peu de largeur). */
function Stat({
  label,
  valueStr,
  title,
  valueTone = 'default',
}: {
  label: string;
  valueStr: string;
  /** Libellé long pour infobulle si raccourci à l’écran. */
  title?: string;
  valueTone?: ValueTone;
}) {
  return (
    <div className="min-w-0" title={title}>
      <div className="starium-kpi-label truncate text-center sm:text-left">
        {label}
      </div>
      <div
        className={cn(
          'starium-kpi-value starium-kpi-value--dense text-center sm:text-left',
          valueToneClass[valueTone],
        )}
      >
        {valueStr}
      </div>
    </div>
  );
}

function KpiGroup({
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
    <section
      className="min-w-0 rounded-lg border border-border bg-transparent px-2.5 py-2 sm:px-3 sm:py-2.5"
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="starium-overline mb-1.5 border-b border-border pb-1"
      >
        {label}
      </h2>
      <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 sm:gap-x-3">{children}</div>
    </section>
  );
}

/**
 * Synthèse portefeuille — version compacte (grille légère, pas de KpiCard empilés).
 */
export function ProjectsPortfolioKpi({ summary, isLoading }: Props) {
  const s = summary;
  const loading = isLoading;
  const v = (n: number | undefined) => val(n, loading);

  return (
    <Card size="sm" className="starium-panel overflow-hidden border-border" data-testid="projects-portfolio-kpi">
      <CardHeader className="starium-toolbar-header pb-3 pt-3 sm:pb-3">
        <CardTitle>
          Indicateurs portefeuille
        </CardTitle>
        <CardDescription className="text-xs leading-snug text-muted-foreground">
          Synthèse client actif (serveur).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
        <div className="grid gap-2.5 lg:grid-cols-3 lg:gap-3">
          <KpiGroup sectionId="volume" label="Volume">
            <Stat label="Projets" valueStr={v(s?.totalProjects)} valueTone="info" />
            <Stat label="En cours" valueStr={v(s?.inProgressProjects)} valueTone="info" />
            <Stat label="Terminés" valueStr={v(s?.completedProjects)} valueTone="success" />
          </KpiGroup>

          <KpiGroup sectionId="risks" label="Risques & échéances">
            <Stat label="En retard" valueStr={v(s?.lateProjects)} valueTone="warning" />
            <Stat label="Critiques" valueStr={v(s?.criticalProjects)} valueTone="danger" />
            <Stat label="Bloqués" valueStr={v(s?.blockedProjects)} valueTone="danger" />
          </KpiGroup>

          <KpiGroup sectionId="completeness" label="Complétude">
            <Stat
              label="Sans étude de risque"
              title="Aucune étude de risque enregistrée"
              valueStr={v(s?.noRiskProjects)}
              valueTone="warning"
            />
            <Stat
              label="Sans resp."
              title="Sans responsable"
              valueStr={v(s?.noOwnerProjects)}
              valueTone="warning"
            />
            <Stat label="Sans jalons" valueStr={v(s?.noMilestoneProjects)} valueTone="warning" />
          </KpiGroup>
        </div>
      </CardContent>
    </Card>
  );
}
