'use client';

import { Crosshair, AlertTriangle, Unlink, Activity } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
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

export function StrategicKpiCards({
  kpis,
}: {
  kpis: StrategicVisionKpisResponseDto;
}) {
  const objectivesAtRisk = formatObjectivesAtRisk(kpis);
  const strategicDrift = buildStrategicDriftIndicator(kpis);
  const driftLabel =
    strategicDrift.level === 'High'
      ? 'Élevée'
      : strategicDrift.level === 'Medium'
        ? 'Moyenne'
        : 'Faible';

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Alignement des projets"
        value={formatAlignmentRate(kpis.projectAlignmentRate)}
        icon={<Crosshair />}
      />
      <KpiCard
        title="Objectifs à risque"
        value={String(objectivesAtRisk)}
        subtitle={`${kpis.objectivesAtRiskCount} à risque · ${kpis.objectivesOffTrackCount} hors trajectoire`}
        icon={<AlertTriangle />}
      />
      <KpiCard
        title="Projets non alignés"
        value={String(kpis.unalignedProjectsCount)}
        icon={<Unlink />}
      />
      <KpiCard
        title="Dérive stratégique"
        value={driftLabel}
        subtitle={`Score composite ${strategicDrift.visualScore}/100`}
        icon={<Activity />}
      />
    </div>
  );
}
