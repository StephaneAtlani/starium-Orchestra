'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useStrategicAlertsQuery,
  useStrategicAxesFallbackQuery,
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

  const visionsQ = useStrategicVisionQuery({ enabled: canRead });
  const axesFallbackQ = useStrategicAxesFallbackQuery({ enabled: canRead });
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
        kpis={kpisQ.data}
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
          alerts: { isLoading: alertsQ.isLoading, isError: alertsQ.isError },
        }}
      />
    </PageContainer>
  );
}
