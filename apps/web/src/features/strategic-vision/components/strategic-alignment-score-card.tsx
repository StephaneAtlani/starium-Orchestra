'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { StrategicVisionKpisResponseDto } from '../types/strategic-vision.types';

function formatAlignmentRate(rate: number): string {
  return `${Math.round(Math.max(0, Math.min(rate, 1)) * 100)}%`;
}

export function StrategicAlignmentScoreCard({
  kpis,
  isLoading,
  isError,
}: {
  kpis?: StrategicVisionKpisResponseDto;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Score d&apos;alignement</h2>
        <Skeleton className="h-44 w-full" />
      </section>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Impossible de charger le score d&apos;alignement.</AlertDescription>
      </Alert>
    );
  }

  if (!kpis) {
    return (
      <Alert>
        <AlertDescription>Aucun indicateur d&apos;alignement disponible.</AlertDescription>
      </Alert>
    );
  }

  const objectivesAtRisk = kpis.objectivesAtRiskCount + kpis.objectivesOffTrackCount;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Score d&apos;alignement</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Synthese alignement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Global</p>
            <p className="text-3xl font-semibold">{formatAlignmentRate(kpis.projectAlignmentRate)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Objectifs a risque</p>
              <p className="text-xl font-semibold">{objectivesAtRisk}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Objectifs OFF_TRACK</p>
              <p className="text-xl font-semibold">{kpis.objectivesOffTrackCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
