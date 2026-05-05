'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  StrategicAxisDto,
  StrategicDirectionDto,
  StrategicDirectionKpiRowDto,
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

type QueryState = {
  isLoading: boolean;
  isError: boolean;
};

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
  onDirectionFilterChange,
  kpis,
  kpisByDirection,
  alerts,
  canUpdate,
  canCreate,
  isEditMode,
  queryStates,
}: {
  vision: StrategicVisionDto | null;
  visions: StrategicVisionDto[];
  axes: StrategicAxisDto[];
  objectives: StrategicObjectiveDto[];
  directions: StrategicDirectionDto[];
  directionFilter: string;
  onDirectionFilterChange: (value: string) => void;
  kpis: StrategicVisionKpisResponseDto | undefined;
  kpisByDirection: StrategicVisionKpisByDirectionResponseDto | undefined;
  alerts: StrategicVisionAlertsResponseDto | undefined;
  canUpdate: boolean;
  canCreate: boolean;
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

  const directionRowsForGlobal = (kpisByDirection?.rows ?? []).filter(
    (row) => row.directionId !== null,
  );

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <div className="flex justify-end">
        <label className="w-full max-w-xs space-y-1 text-sm">
          <span className="text-muted-foreground">Vue par direction</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={directionFilter}
            onChange={(event) => onDirectionFilterChange(event.target.value)}
          >
            <option value="ALL">Vue globale entreprise</option>
            {directions.map((direction) => (
              <option key={direction.id} value={direction.id}>
                {direction.name} ({direction.code})
              </option>
            ))}
            <option value="UNASSIGNED">Non affecté</option>
          </select>
        </label>
      </div>
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
        <TabsTrigger value="enterprise">Vision entreprise</TabsTrigger>
        <TabsTrigger value="axes">Axes strategiques</TabsTrigger>
        <TabsTrigger value="objectives">Objectifs</TabsTrigger>
        <TabsTrigger value="alignment">Alignement</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
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
            {directionFilter === 'ALL' && !queryStates.kpisByDirection.isLoading ? (
              <DirectionKpisTable rows={directionRowsForGlobal} />
            ) : null}
            <StrategicAlertsPanel
              alerts={alerts}
              isLoading={queryStates.alerts.isLoading}
              isError={queryStates.alerts.isError}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="enterprise">
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
            directions={directions}
            canUpdate={canUpdate}
            canCreate={canCreate}
          />
        ) : null}
      </TabsContent>

      <TabsContent value="axes">
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
      </TabsContent>

      <TabsContent value="objectives">
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
      </TabsContent>

      <TabsContent value="alignment">
        <QueryStateBlock
          loadingLabel="Chargement de l'alignement..."
          errorLabel="Impossible de charger l'alignement."
          queryState={baseState}
        />
        {!baseState.isLoading && !baseState.isError ? (
          <StrategicAlignmentTab axes={axes} objectives={filteredObjectives} kpis={kpis} />
        ) : null}
      </TabsContent>
    </Tabs>
  );
}

function DirectionKpisTable({ rows }: { rows: StrategicDirectionKpiRowDto[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 text-sm font-medium">Lecture KPI par direction</p>
      <div className="space-y-1 text-xs text-muted-foreground">
        {rows.map((row) => (
          <p key={row.directionCode}>
            {row.directionName}: {Math.round(row.projectAlignmentRate * 100)}% alignement,{' '}
            {row.objectivesAtRiskCount + row.objectivesOffTrackCount} objectifs à risque
          </p>
        ))}
      </div>
    </div>
  );
}
