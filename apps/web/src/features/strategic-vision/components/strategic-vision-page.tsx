'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useStrategicAlertsQuery,
  useStrategicAxesQuery,
  useStrategicKpisQuery,
  useStrategicObjectivesQuery,
  useStrategicVisionQuery,
} from '../hooks/use-strategic-vision-queries';
import { StrategicAlertsPanel } from './strategic-alerts-panel';
import { StrategicAxisCard } from './strategic-axis-card';
import { StrategicKpiCards } from './strategic-kpi-cards';
import { StrategicLinksPanel } from './strategic-links-panel';
import { StrategicVisionSummaryCard } from './strategic-vision-summary-card';

function SectionSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

export function StrategicVisionPage() {
  const { has } = usePermissions();
  const canRead = has('strategic_vision.read');

  const visionsQ = useStrategicVisionQuery({ enabled: canRead });
  const axesQ = useStrategicAxesQuery({ enabled: canRead });
  const objectivesQ = useStrategicObjectivesQuery({ enabled: canRead });
  const kpisQ = useStrategicKpisQuery({ enabled: canRead });
  const alertsQ = useStrategicAlertsQuery({ enabled: canRead });

  if (!canRead) {
    return (
      <Alert>
        <AlertDescription>
          Permission <code className="text-xs">strategic_vision.read</code> requise.
        </AlertDescription>
      </Alert>
    );
  }

  const activeVision = visionsQ.data?.find((vision) => vision.isActive) ?? null;

  return (
    <PageContainer>
      <PageHeader
        title="Strategic Vision"
        description="Cockpit de pilotage de l'alignement strategique."
      />

      {kpisQ.isLoading ? <SectionSkeleton /> : null}
      {kpisQ.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Impossible de charger les KPI strategiques.</AlertDescription>
        </Alert>
      ) : null}
      {kpisQ.isSuccess ? <StrategicKpiCards kpis={kpisQ.data} /> : null}

      {visionsQ.isLoading ? <SectionSkeleton /> : null}
      {visionsQ.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Impossible de charger la vision strategique.</AlertDescription>
        </Alert>
      ) : null}
      {visionsQ.isSuccess && activeVision ? (
        <StrategicVisionSummaryCard vision={activeVision} />
      ) : null}
      {visionsQ.isSuccess && !activeVision ? (
        <Alert>
          <AlertDescription>Aucune vision active disponible pour ce client.</AlertDescription>
        </Alert>
      ) : null}

      {axesQ.isLoading ? <SectionSkeleton /> : null}
      {axesQ.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Impossible de charger les axes strategiques.</AlertDescription>
        </Alert>
      ) : null}
      {axesQ.isSuccess && axesQ.data.length === 0 ? (
        <Alert>
          <AlertDescription>Aucun axe strategique configure.</AlertDescription>
        </Alert>
      ) : null}
      {axesQ.isSuccess && axesQ.data.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Axes et objectifs</h2>
          {axesQ.data.map((axis) => (
            <StrategicAxisCard key={axis.id} axis={axis} />
          ))}
        </section>
      ) : null}

      {objectivesQ.isLoading ? <SectionSkeleton /> : null}
      {objectivesQ.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Impossible de charger les objectifs strategiques.</AlertDescription>
        </Alert>
      ) : null}
      {objectivesQ.isSuccess ? (
        <StrategicLinksPanel objectives={objectivesQ.data} />
      ) : null}

      <StrategicAlertsPanel
        alerts={alertsQ.data}
        isLoading={alertsQ.isLoading}
        isError={alertsQ.isError}
      />
    </PageContainer>
  );
}
