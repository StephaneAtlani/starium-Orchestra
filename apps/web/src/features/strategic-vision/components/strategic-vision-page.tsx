'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useStrategicAlertsQuery,
  useStrategicAxesFallbackQuery,
  useStrategicDirectionsQuery,
  useStrategicKpisByDirectionQuery,
  useStrategicKpisQuery,
  useStrategicObjectivesQuery,
  useStrategicVisionQuery,
} from '../hooks/use-strategic-vision-queries';
import { getActiveVision, getAxesFromVision } from '../lib/strategic-vision-tabs-view';
import { StrategicVisionTabs } from './strategic-vision-tabs';

export function StrategicVisionPage() {
  const { has } = usePermissions();
  const canRead = has('strategic_vision.read');
  const canUpdate = has('strategic_vision.update');
  const canCreate = has('strategic_vision.create');
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');

  const visionsQ = useStrategicVisionQuery({ enabled: canRead });
  const axesFallbackQ = useStrategicAxesFallbackQuery({ enabled: canRead });
  const objectivesQ = useStrategicObjectivesQuery({ enabled: canRead });
  const directionsQ = useStrategicDirectionsQuery({ enabled: canRead });
  const kpisQ = useStrategicKpisQuery({ enabled: canRead });
  const kpisByDirectionQ = useStrategicKpisByDirectionQuery({ enabled: canRead });
  const alertsQ = useStrategicAlertsQuery({
    enabled: canRead,
    directionId: directionFilter !== 'ALL' && directionFilter !== 'UNASSIGNED' ? directionFilter : undefined,
    unassigned: directionFilter === 'UNASSIGNED',
  });

  if (!canRead) {
    return (
      <Alert>
        <AlertDescription>
          Permission <code className="text-xs">strategic_vision.read</code> requise.
        </AlertDescription>
      </Alert>
    );
  }

  const activeVision = getActiveVision(visionsQ.data ?? []);
  const axesFromVision = getAxesFromVision(activeVision);
  const axes = axesFromVision.length > 0 ? axesFromVision : (axesFallbackQ.data ?? []);
  const objectives = objectivesQ.data ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Strategic Vision"
        description="Cockpit de pilotage de l'alignement strategique."
      />
      <StrategicVisionTabs
        vision={activeVision}
        visions={visionsQ.data ?? []}
        axes={axes}
        objectives={objectives}
        directions={directionsQ.data ?? []}
        directionFilter={directionFilter}
        onDirectionFilterChange={setDirectionFilter}
        kpis={kpisQ.data}
        kpisByDirection={kpisByDirectionQ.data}
        alerts={alertsQ.data}
        canUpdate={canUpdate}
        canCreate={canCreate}
        isEditMode={false}
        queryStates={{
          visions: { isLoading: visionsQ.isLoading, isError: visionsQ.isError },
          objectives: {
            isLoading: objectivesQ.isLoading || axesFallbackQ.isLoading,
            isError: objectivesQ.isError || axesFallbackQ.isError,
          },
          kpis: { isLoading: kpisQ.isLoading, isError: kpisQ.isError },
          kpisByDirection: {
            isLoading: kpisByDirectionQ.isLoading,
            isError: kpisByDirectionQ.isError,
          },
          alerts: { isLoading: alertsQ.isLoading, isError: alertsQ.isError },
        }}
      />
    </PageContainer>
  );
}
