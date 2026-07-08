'use client';

import { Activity, AlertTriangle, Crosshair, Unlink } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import {
  STRATEGIC_OVERVIEW_GOLD_ICON,
  STRATEGIC_OVERVIEW_ICON_SIZE,
} from '../lib/strategic-overview-theme';
import type { StrategicVisionKpisResponseDto } from '../types/strategic-vision.types';

function formatAlignmentRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function formatObjectivesAtRisk(kpis: StrategicVisionKpisResponseDto): number {
  return kpis.objectivesAtRiskCount + kpis.objectivesOffTrackCount;
}

export function buildStrategicDriftIndicator(kpis: StrategicVisionKpisResponseDto): {
  level: 'Low' | 'Medium' | 'High';
  visualScore: number;
} {
  const alignmentPenalty = (1 - Math.max(0, Math.min(kpis.projectAlignmentRate, 1))) * 50;
  const riskPenalty = Math.min(formatObjectivesAtRisk(kpis) * 8, 30);
  const overduePenalty = Math.min(kpis.overdueObjectivesCount * 5, 20);
  const visualScore = Math.round(alignmentPenalty + riskPenalty + overduePenalty);

  if (visualScore >= 65) return { level: 'High', visualScore };
  if (visualScore >= 35) return { level: 'Medium', visualScore };
  return { level: 'Low', visualScore };
}

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

export function StrategicKpiCards({
  kpis,
  isLoading = false,
  isError = false,
}: {
  kpis?: StrategicVisionKpisResponseDto;
  isLoading?: boolean;
  isError?: boolean;
}) {
  if (isLoading && !kpis) {
    return (
      <section className="starium-module" data-testid="strategic-kpi-cards">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <KpiCardSkeleton key={index} />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="starium-module" data-testid="strategic-kpi-cards">
        <ErrorState message="Impossible de charger les KPI stratégiques." />
      </section>
    );
  }

  if (!kpis) {
    return (
      <section className="starium-module" data-testid="strategic-kpi-cards">
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          Aucun KPI stratégique disponible pour ce périmètre.
        </div>
      </section>
    );
  }

  const objectivesAtRisk = formatObjectivesAtRisk(kpis);
  const strategicDrift = buildStrategicDriftIndicator(kpis);
  const driftLabel =
    strategicDrift.level === 'High'
      ? 'Élevée'
      : strategicDrift.level === 'Medium'
        ? 'Moyenne'
        : 'Faible';

  const iconClass = STRATEGIC_OVERVIEW_ICON_SIZE;

  return (
    <section className="starium-module" data-testid="strategic-kpi-cards">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Alignement des projets"
          value={formatAlignmentRate(kpis.projectAlignmentRate)}
          icon={<Crosshair className={iconClass} aria-hidden />}
          iconWrapperClassName={STRATEGIC_OVERVIEW_GOLD_ICON}
        />
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Objectifs à risque"
          value={String(objectivesAtRisk)}
          footer={`${kpis.objectivesAtRiskCount} à risque · ${kpis.objectivesOffTrackCount} hors trajectoire`}
          footerTone="muted"
          icon={<AlertTriangle className={iconClass} aria-hidden />}
          iconWrapperClassName={STRATEGIC_OVERVIEW_GOLD_ICON}
        />
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Projets non alignés"
          value={String(kpis.unalignedProjectsCount)}
          icon={<Unlink className={iconClass} aria-hidden />}
          iconWrapperClassName={STRATEGIC_OVERVIEW_GOLD_ICON}
        />
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Dérive stratégique"
          value={driftLabel}
          footer={`Score composite ${strategicDrift.visualScore}/100`}
          footerTone="muted"
          icon={<Activity className={iconClass} aria-hidden />}
          iconWrapperClassName={STRATEGIC_OVERVIEW_GOLD_ICON}
        />
      </div>
    </section>
  );
}
