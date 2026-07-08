'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  Crosshair,
  History,
  LayoutGrid,
  Link2,
  Signpost,
  Target,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  WorkspaceTabBar,
  type WorkspaceTabBarItem,
} from '@/components/layout/workspace-tab-bar';
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

export const STRATEGIC_VISION_TABS: ReadonlyArray<{
  key: StrategicVisionMenuKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: 'overview', label: "Vue d'ensemble", icon: LayoutGrid },
  { key: 'enterprise', label: 'Vision entreprise', icon: Building2 },
  { key: 'directions', label: 'Directions', icon: Signpost },
  { key: 'axes', label: 'Axes stratégiques', icon: Crosshair },
  { key: 'objectives', label: 'Objectifs', icon: Target },
  { key: 'alignment', label: 'Alignement', icon: Link2 },
  { key: 'alerts', label: 'Alertes', icon: AlertTriangle },
  { key: 'history', label: 'Historique', icon: History },
] as const;

const STRATEGIC_VISION_TAB_BAR_ITEMS: WorkspaceTabBarItem[] = STRATEGIC_VISION_TABS.map(
  (tab) => ({
    id: tab.key,
    label: tab.label,
    icon: tab.icon,
  }),
);

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
    return <LoadingState rows={3} />;
  }

  if (queryState.isError) {
    return <ErrorState message={errorLabel} />;
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

  return (
    <div className="space-y-5">
      <WorkspaceTabBar
        items={STRATEGIC_VISION_TAB_BAR_ITEMS}
        activeId={activeMenu}
        onSelect={(id) => {
          const next = parseMenuKey(id);
          if (next) setActiveMenu(next);
        }}
        ariaLabel="Sections vision stratégique"
        mobileEyebrow="Section"
        selectId="strategic-vision-tab-select"
        mobileAriaLabel="Choisir une section de la vision stratégique"
        data-testid="strategic-tabs-container"
      />

      <section className="space-y-4">
          {activeMenu === 'overview' ? (
            <StrategicVisionOverviewTab
              vision={vision}
              axes={axes}
              objectives={filteredObjectives}
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
              kpisLoading={queryStates.kpis.isLoading}
              kpisError={queryStates.kpis.isError}
              isLoading={baseState.isLoading}
              isError={baseState.isError}
              isEditMode={isEditMode}
              canUpdate={canUpdate}
            />
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
