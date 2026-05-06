'use client';

import React from 'react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/page-container';
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
import { StrategicAlertsPanel } from './strategic-alerts-panel';
import { StrategicKpiCards } from './strategic-kpi-cards';
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
      <section className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Gouvernance / Vision stratégique
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[#1B1B1B]">
                {pageTitle}
              </h1>
              <span className="inline-flex items-center rounded-full border border-[#DB9801]/40 bg-[#DB9801]/10 px-2.5 py-0.5 text-xs font-medium text-[#1B1B1B]">
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{pageSubtitle}</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDirectionFilter('ALL')}
            >
              Réinitialiser filtres
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDirectionFilter('UNASSIGNED')}
            >
              Voir non affectés
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {kpisQ.data ? <StrategicKpiCards kpis={kpisQ.data} /> : null}
        <StrategicAlertsPanel
          alerts={alertsQ.data}
          isLoading={alertsQ.isLoading}
          isError={alertsQ.isError}
        />
      </section>

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
