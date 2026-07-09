'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { hasVisionWorkflowContent } from '../lib/strategic-vision-workflow';
import { StrategicDirectionsDialog } from './strategic-directions-dialog';
import { StrategicVisionCockpitFilterBar } from './strategic-vision-cockpit-filter-bar';
import { StrategicVisionTabs } from './strategic-vision-tabs';
import { StrategicVisionWorkflowDialog } from './strategic-vision-workflow-dialog';

export function StrategicVisionPage() {
  const searchParams = useSearchParams();
  const { has } = usePermissions();
  const canRead = has('strategic_vision.read');
  const canUpdate = has('strategic_vision.update');
  const canCreate = has('strategic_vision.create');
  const canManageLinks = has('strategic_vision.manage_links');
  const canManageDirections = has('strategic_vision.update') || has('strategic_vision.manage_directions');
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');
  const [visionWorkflowDialogOpen, setVisionWorkflowDialogOpen] = useState(false);
  const [directionsDialogOpen, setDirectionsDialogOpen] = useState(false);

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

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'enterprise') {
      setVisionWorkflowDialogOpen(true);
    }
    if (tab === 'directions') {
      setDirectionsDialogOpen(true);
    }
  }, [searchParams]);

  const unalignedProjectAlerts = useMemo(
    () => alertsQ.data?.items.filter((item) => item.type === 'PROJECT_UNALIGNED') ?? [],
    [alertsQ.data?.items],
  );

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
  const directions = directionsQ.data ?? [];
  const visions = visionsQ.data ?? [];
  const showVisionWorkflowActions = hasVisionWorkflowContent(visions, canUpdate, canCreate);
  const directionFilterLabel =
    directionFilter === 'ALL'
      ? 'Toutes les directions'
      : directionFilter === 'UNASSIGNED'
        ? 'Non affectés'
        : directions.find((d) => d.id === directionFilter)?.name ?? 'Direction';
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

      <StrategicVisionCockpitFilterBar
        directionFilter={directionFilter}
        directionFilterLabel={directionFilterLabel}
        directions={directions}
        onDirectionFilterChange={setDirectionFilter}
        onManageVisions={() => setVisionWorkflowDialogOpen(true)}
        onManageDirections={() => setDirectionsDialogOpen(true)}
        showVisionActions={showVisionWorkflowActions}
      />

      <StrategicVisionTabs
        vision={activeVision}
        visions={visions}
        axes={axes}
        objectives={objectives}
        directions={directions}
        directionFilter={directionFilter}
        kpis={kpisQ.data}
        kpisByDirection={kpisByDirectionQ.data}
        alerts={alertsQ.data}
        unalignedProjectAlerts={unalignedProjectAlerts}
        canUpdate={canUpdate}
        canCreate={canCreate}
        canManageLinks={canManageLinks}
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

      <StrategicVisionWorkflowDialog
        open={visionWorkflowDialogOpen}
        onOpenChange={setVisionWorkflowDialogOpen}
        visions={visions}
        canUpdate={canUpdate}
        canCreate={canCreate}
      />

      <StrategicDirectionsDialog
        open={directionsDialogOpen}
        onOpenChange={setDirectionsDialogOpen}
        directions={directions}
        directionsQueryState={{
          isLoading: directionsQ.isLoading,
          isError: directionsQ.isError,
        }}
        canManageDirections={canManageDirections}
      />
    </PageContainer>
  );
}
