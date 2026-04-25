'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Strategic Alignment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatAlignmentRate(kpis.projectAlignmentRate)}</p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Objectives at Risk</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{objectivesAtRisk}</p>
          <p className="text-xs text-muted-foreground">
            {kpis.objectivesAtRiskCount} AT_RISK + {kpis.objectivesOffTrackCount} OFF_TRACK
          </p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Unaligned Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{kpis.unalignedProjectsCount}</p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Strategic Drift</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{strategicDrift.level}</p>
          <p className="text-xs text-muted-foreground">
            Composite UI: {strategicDrift.visualScore}/100 (base KPI existants)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
