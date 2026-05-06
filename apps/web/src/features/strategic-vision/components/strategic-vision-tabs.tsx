'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type {
  StrategicAxisDto,
  StrategicDirectionDto,
  StrategicObjectiveDto,
  StrategicVisionAlertsResponseDto,
  StrategicVisionDto,
  StrategicVisionKpisByDirectionResponseDto,
  StrategicVisionKpisResponseDto,
} from '../types/strategic-vision.types';
import { StrategicAlertsPanel } from './strategic-alerts-panel';
import { StrategicAxesTab } from './strategic-axes-tab';
import { StrategicObjectivesTab } from './strategic-objectives-tab';
import { StrategicVisionEnterpriseTab } from './strategic-vision-enterprise-tab';
import { StrategicVisionOverviewTab } from './strategic-vision-overview-tab';
import { splitAxisLogoAndTitle } from '../lib/strategic-vision-tabs-view';
import { StrategicAlignmentTab } from './strategic-alignment-tab';
import { StrategicAlignmentScoreCard } from './strategic-alignment-score-card';
import { StrategicDirectionsTab } from './strategic-directions-tab';

type QueryState = {
  isLoading: boolean;
  isError: boolean;
};

type StrategicVisionMenuKey =
  | 'overview'
  | 'enterprise'
  | 'directions'
  | 'axes'
  | 'objectives'
  | 'alignment';

function parseMenuKey(value: string | null): StrategicVisionMenuKey | null {
  if (
    value === 'overview' ||
    value === 'enterprise' ||
    value === 'directions' ||
    value === 'axes' ||
    value === 'objectives' ||
    value === 'alignment'
  ) {
    return value;
  }
  return null;
}

function QueryStateBlock({
  loadingLabel,
  errorLabel,
  queryState,
}: {
  loadingLabel: string;
  errorLabel: string;
  queryState: QueryState;
}) {
  if (queryState.isLoading) {
    return (
      <Alert>
        <AlertDescription>{loadingLabel}</AlertDescription>
      </Alert>
    );
  }

  if (queryState.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorLabel}</AlertDescription>
      </Alert>
    );
  }

  return null;
}

export function StrategicVisionTabs({
  vision,
  visions,
  axes,
  objectives,
  directions,
  directionFilter,
  kpis,
  kpisByDirection,
  alerts,
  canUpdate,
  canCreate,
  canManageDirections,
  directionsQueryState,
  isEditMode,
  queryStates,
}: {
  vision: StrategicVisionDto | null;
  visions: StrategicVisionDto[];
  axes: StrategicAxisDto[];
  objectives: StrategicObjectiveDto[];
  directions: StrategicDirectionDto[];
  directionFilter: string;
  kpis: StrategicVisionKpisResponseDto | undefined;
  kpisByDirection: StrategicVisionKpisByDirectionResponseDto | undefined;
  alerts: StrategicVisionAlertsResponseDto | undefined;
  canUpdate: boolean;
  canCreate: boolean;
  canManageDirections: boolean;
  directionsQueryState: { isLoading: boolean; isError: boolean };
  isEditMode: boolean;
  queryStates: {
    visions: QueryState;
    objectives: QueryState;
    kpis: QueryState;
    kpisByDirection: QueryState;
    alerts: QueryState;
  };
}) {
  const baseState =
    queryStates.visions.isLoading || queryStates.objectives.isLoading
      ? { isLoading: true, isError: false }
      : queryStates.visions.isError || queryStates.objectives.isError
        ? { isLoading: false, isError: true }
        : { isLoading: false, isError: false };

  const axisOptions = axes.map((axis) => ({
    id: axis.id,
    name: splitAxisLogoAndTitle(axis.name).title,
  }));
  const filteredObjectives =
    directionFilter === 'ALL'
      ? objectives
      : directionFilter === 'UNASSIGNED'
        ? objectives.filter((objective) => objective.directionId == null)
        : objectives.filter((objective) => objective.directionId === directionFilter);

  const selectedDirectionRow =
    directionFilter === 'ALL'
      ? null
      : kpisByDirection?.rows.find((row) =>
          directionFilter === 'UNASSIGNED'
            ? row.directionId == null
            : row.directionId === directionFilter,
        ) ?? null;

  const searchParams = useSearchParams();
  const initialMenu = parseMenuKey(searchParams.get('tab')) ?? 'overview';
  const [activeMenu, setActiveMenu] = useState<StrategicVisionMenuKey>(initialMenu);

  useEffect(() => {
    const nextMenu = parseMenuKey(searchParams.get('tab'));
    if (nextMenu) {
      setActiveMenu(nextMenu);
    }
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-1.5" aria-label="Onglets strategic vision">
        <nav className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveMenu('overview')}
            className={cn(
              'rounded-lg px-3 py-2 text-sm transition-colors',
              activeMenu === 'overview'
                ? 'bg-primary/15 text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            Vue d&apos;ensemble
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('enterprise')}
            className={cn(
              'rounded-lg px-3 py-2 text-sm transition-colors',
              activeMenu === 'enterprise'
                ? 'bg-primary/15 text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            Vision entreprise
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('directions')}
            className={cn(
              'rounded-lg px-3 py-2 text-sm transition-colors',
              activeMenu === 'directions'
                ? 'bg-primary/15 text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            Directions
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('axes')}
            className={cn(
              'rounded-lg px-3 py-2 text-sm transition-colors',
              activeMenu === 'axes'
                ? 'bg-primary/15 text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            Axes stratégiques
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('objectives')}
            className={cn(
              'rounded-lg px-3 py-2 text-sm transition-colors',
              activeMenu === 'objectives'
                ? 'bg-primary/15 text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            Objectifs
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('alignment')}
            className={cn(
              'rounded-lg px-3 py-2 text-sm transition-colors',
              activeMenu === 'alignment'
                ? 'bg-primary/15 text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            Alignement
          </button>
        </nav>
      </div>

      <section className="space-y-4">
          {activeMenu === 'overview' ? (
            <div className="space-y-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <StrategicVisionOverviewTab
              vision={vision}
              axes={axes}
              objectives={filteredObjectives}
              isLoading={baseState.isLoading}
              isError={baseState.isError}
              isEditMode={isEditMode}
              canUpdate={canUpdate}
            />
          </div>
          <div className="space-y-6 lg:col-span-1">
            <StrategicAlignmentScoreCard
              kpis={
                directionFilter === 'ALL' || !selectedDirectionRow
                  ? kpis
                  : {
                      projectAlignmentRate: selectedDirectionRow.projectAlignmentRate,
                      unalignedProjectsCount: selectedDirectionRow.unalignedProjectsCount,
                      objectivesAtRiskCount: selectedDirectionRow.objectivesAtRiskCount,
                      objectivesOffTrackCount: selectedDirectionRow.objectivesOffTrackCount,
                      overdueObjectivesCount: selectedDirectionRow.overdueObjectivesCount,
                      generatedAt: kpisByDirection?.generatedAt ?? kpis?.generatedAt ?? '',
                    }
              }
              isLoading={queryStates.kpis.isLoading}
              isError={queryStates.kpis.isError}
            />
            <StrategicAlertsPanel
              alerts={alerts}
              isLoading={queryStates.alerts.isLoading}
              isError={queryStates.alerts.isError}
            />
          </div>
        </div>
            </div>
          ) : null}

          {activeMenu === 'enterprise' ? (
            <div>
        <QueryStateBlock
          loadingLabel="Chargement de la vision entreprise..."
          errorLabel="Impossible de charger la vision entreprise."
          queryState={baseState}
        />
        {!baseState.isLoading && !baseState.isError ? (
          <StrategicVisionEnterpriseTab
            vision={vision}
            visions={visions}
            axes={axes}
            objectives={filteredObjectives}
            canUpdate={canUpdate}
            canCreate={canCreate}
          />
        ) : null}
            </div>
          ) : null}

          {activeMenu === 'directions' ? (
            <StrategicDirectionsTab
              directions={directions}
              directionsQueryState={directionsQueryState}
              canManageDirections={canManageDirections}
            />
          ) : null}

          {activeMenu === 'axes' ? (
            <div>
        <QueryStateBlock
          loadingLabel="Chargement des axes strategiques..."
          errorLabel="Impossible de charger les axes strategiques."
          queryState={baseState}
        />
        {!baseState.isLoading && !baseState.isError ? (
          <StrategicAxesTab
            axes={axes}
            canUpdate={canUpdate}
            canCreate={canCreate}
            visionId={vision?.id ?? null}
            visionTitle={vision?.title ?? null}
          />
        ) : null}
            </div>
          ) : null}

          {activeMenu === 'objectives' ? (
            <div>
        <QueryStateBlock
          loadingLabel="Chargement des objectifs..."
          errorLabel="Impossible de charger les objectifs."
          queryState={baseState}
        />
        {!baseState.isLoading && !baseState.isError ? (
          <StrategicObjectivesTab
            objectives={objectives}
            axisOptions={axisOptions}
            directionOptions={directions.map((direction) => ({
              id: direction.id,
              label: `${direction.name} (${direction.code})`,
            }))}
            directionFilter={directionFilter}
            canCreate={canCreate}
            canUpdate={canUpdate}
          />
        ) : null}
            </div>
          ) : null}

          {activeMenu === 'alignment' ? (
            <div>
        <QueryStateBlock
          loadingLabel="Chargement de l'alignement..."
          errorLabel="Impossible de charger l'alignement."
          queryState={baseState}
        />
        {!baseState.isLoading && !baseState.isError ? (
          <StrategicAlignmentTab axes={axes} objectives={filteredObjectives} kpis={kpis} />
        ) : null}
            </div>
          ) : null}
      </section>
    </div>
  );
}
