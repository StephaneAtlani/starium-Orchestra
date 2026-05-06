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

export type StrategicVisionMenuKey =
  | 'overview'
  | 'enterprise'
  | 'directions'
  | 'axes'
  | 'objectives'
  | 'alignment'
  | 'alerts'
  | 'history';

export function parseMenuKey(value: string | null): StrategicVisionMenuKey | null {
  if (
    value === 'overview' ||
    value === 'enterprise' ||
    value === 'directions' ||
    value === 'axes' ||
    value === 'objectives' ||
    value === 'alignment' ||
    value === 'alerts' ||
    value === 'history'
  ) {
    return value;
  }
  return null;
}

export const STRATEGIC_VISION_HISTORY_PLACEHOLDER_MESSAGE =
  "L'historique détaillé sera disponible dans une prochaine version. Cette V1 n'inclut pas encore de source backend dédiée.";

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
  canManageLinks,
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
  canManageLinks: boolean;
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

  const tabClass = (isActive: boolean) =>
    cn(
      'rounded-lg border px-3 py-2 text-sm transition-colors whitespace-nowrap',
      isActive
        ? 'border-[#DB9801]/50 bg-[#DB9801]/15 font-medium text-[#1B1B1B]'
        : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground',
    );

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border bg-card p-2 sm:p-2.5"
        aria-label="Onglets strategic vision"
        data-testid="strategic-tabs-container"
      >
        <nav className="flex min-h-12 items-center gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveMenu('overview')}
            className={tabClass(activeMenu === 'overview')}
          >
            Vue d&apos;ensemble
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('enterprise')}
            className={tabClass(activeMenu === 'enterprise')}
          >
            Vision entreprise
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('directions')}
            className={tabClass(activeMenu === 'directions')}
          >
            Directions
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('axes')}
            className={tabClass(activeMenu === 'axes')}
          >
            Axes stratégiques
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('objectives')}
            className={tabClass(activeMenu === 'objectives')}
          >
            Objectifs
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('alignment')}
            className={tabClass(activeMenu === 'alignment')}
          >
            Alignement
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('alerts')}
            className={tabClass(activeMenu === 'alerts')}
          >
            Alertes
          </button>
          <button
            type="button"
            onClick={() => setActiveMenu('history')}
            className={tabClass(activeMenu === 'history')}
          >
            Historique
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
            canManageLinks={canManageLinks}
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

          {activeMenu === 'alerts' ? (
            <div>
              <QueryStateBlock
                loadingLabel="Chargement des alertes..."
                errorLabel="Impossible de charger les alertes."
                queryState={queryStates.alerts}
              />
              {!queryStates.alerts.isLoading && !queryStates.alerts.isError ? (
                <StrategicAlertsPanel
                  alerts={alerts}
                  isLoading={queryStates.alerts.isLoading}
                  isError={queryStates.alerts.isError}
                />
              ) : null}
            </div>
          ) : null}

          {activeMenu === 'history' ? (
            <Alert>
              <AlertDescription>
                {STRATEGIC_VISION_HISTORY_PLACEHOLDER_MESSAGE}
              </AlertDescription>
            </Alert>
          ) : null}
      </section>
    </div>
  );
}
