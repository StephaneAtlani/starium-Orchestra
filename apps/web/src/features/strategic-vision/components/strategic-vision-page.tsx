'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
  const canManageLinks = has('strategic_vision.manage_links');
  const canManageDirections = has('strategic_vision.update') || has('strategic_vision.manage_directions');
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
  const pageTitle = activeVision?.title?.trim() || 'Vision stratégique 2026';
  const pageSubtitle =
    activeVision?.statement?.trim() ||
    "Cockpit de pilotage de l'alignement stratégique.";
  const statusLabel =
    activeVision?.status === 'ACTIVE'
      ? 'Active'
      : activeVision?.status === 'ARCHIVED'
        ? 'Archivée'
        : 'Brouillon';

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {pageTitle}
            <span className="inline-flex items-center rounded-full bg-[color:var(--brand-gold-100)] px-2.5 py-0.5 text-xs font-semibold text-[color:var(--brand-gold-700)]">
              {statusLabel}
            </span>
          </span>
        }
        description={pageSubtitle}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 md:min-h-0"
              onClick={() => setDirectionFilter('ALL')}
            >
              Réinitialiser filtres
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 md:min-h-0"
              onClick={() => setDirectionFilter('UNASSIGNED')}
            >
              Voir non affectés
            </Button>
          </>
        }
      />

      <StrategicVisionTabs
        vision={activeVision}
        visions={visionsQ.data ?? []}
        axes={axes}
        objectives={objectives}
        directions={directionsQ.data ?? []}
        directionFilter={directionFilter}
        kpis={kpisQ.data}
        kpisByDirection={kpisByDirectionQ.data}
        alerts={alertsQ.data}
        canUpdate={canUpdate}
        canCreate={canCreate}
        canManageLinks={canManageLinks}
        canManageDirections={canManageDirections}
        directionsQueryState={{
          isLoading: directionsQ.isLoading,
          isError: directionsQ.isError,
        }}
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
