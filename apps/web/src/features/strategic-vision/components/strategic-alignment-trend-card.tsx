'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import type { StrategicVisionKpisResponseDto } from '../types/strategic-vision.types';

const TARGET_RATE = 0.85;

function pctLabel(rate: number): string {
  return `${Math.round(Math.max(0, Math.min(rate, 1)) * 100)}%`;
}

export function StrategicAlignmentTrendCard({
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
      <Card size="sm" className="starium-panel">
        <CardHeader>
          <CardTitle>Évolution du score d&apos;alignement</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return <ErrorState message="Impossible de charger le score d'alignement." />;
  }

  if (!kpis) {
    return (
      <Card size="sm" className="starium-panel">
        <CardHeader>
          <CardTitle>Évolution du score d&apos;alignement</CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <EmptyState
            title="Indicateur indisponible"
            description="Aucun indicateur d'alignement disponible pour ce périmètre."
          />
        </CardContent>
      </Card>
    );
  }

  const rate = Math.max(0, Math.min(kpis.projectAlignmentRate, 1));
  const targetPct = Math.round(TARGET_RATE * 100);

  return (
    <Card size="sm" className="starium-panel">
      <CardHeader className="border-b border-border/70">
        <CardTitle>Évolution du score d&apos;alignement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-baseline gap-2">
          <span className="starium-kpi-value starium-kpi-value--portfolio text-[color:var(--brand-gold-700)]">
            {pctLabel(rate)}
          </span>
          <span className="text-sm text-muted-foreground">score global actuel</span>
        </div>

        <div className="space-y-1.5">
          <div className="relative starium-progress-track h-2">
            <div
              className="starium-progress-fill starium-progress-fill--ok"
              style={{ width: `${Math.round(rate * 100)}%` }}
            />
            <span
              aria-hidden
              className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-[color:var(--neutral-400)]"
              style={{ left: `${targetPct}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded bg-[color:var(--brand-gold)]" />
              Score d&apos;alignement global
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded border-t border-dashed border-[color:var(--neutral-400)]" />
              Objectif 2026 ({targetPct}%)
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Tendance mensuelle disponible prochainement (historique dédié backend).
        </p>
      </CardContent>
    </Card>
  );
}
