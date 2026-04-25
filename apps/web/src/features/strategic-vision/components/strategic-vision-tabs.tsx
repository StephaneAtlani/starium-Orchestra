'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  StrategicAxisDto,
  StrategicObjectiveDto,
  StrategicVisionAlertsResponseDto,
  StrategicVisionDto,
  StrategicVisionKpisResponseDto,
} from '../types/strategic-vision.types';
import { StrategicAlertsPanel } from './strategic-alerts-panel';
import { StrategicAxesTab } from './strategic-axes-tab';
import { StrategicObjectivesTab } from './strategic-objectives-tab';
import { StrategicVisionEnterpriseTab } from './strategic-vision-enterprise-tab';
import { StrategicVisionOverviewTab } from './strategic-vision-overview-tab';

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
  axes,
  objectives,
  kpis,
  alerts,
  canUpdate,
  queryStates,
}: {
  vision: StrategicVisionDto | null;
  axes: StrategicAxisDto[];
  objectives: StrategicObjectiveDto[];
  kpis: StrategicVisionKpisResponseDto | undefined;
  alerts: StrategicVisionAlertsResponseDto | undefined;
  canUpdate: boolean;
  queryStates: {
    visions: QueryState;
    objectives: QueryState;
    kpis: QueryState;
    alerts: QueryState;
  };
}) {
  const baseState =
    queryStates.visions.isLoading || queryStates.objectives.isLoading
      ? { isLoading: true, isError: false }
      : queryStates.visions.isError || queryStates.objectives.isError
        ? { isLoading: false, isError: true }
        : { isLoading: false, isError: false };

  const axisOptions = axes.map((axis) => ({ id: axis.id, name: axis.name }));

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
        <TabsTrigger value="enterprise">Vision entreprise</TabsTrigger>
        <TabsTrigger value="axes">Axes strategiques</TabsTrigger>
        <TabsTrigger value="objectives">Objectifs</TabsTrigger>
        <TabsTrigger value="alignment">Alignement</TabsTrigger>
        <TabsTrigger value="history">Historique</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <QueryStateBlock
          loadingLabel="Chargement de la vue d'ensemble..."
          errorLabel="Impossible de charger la vue d'ensemble."
          queryState={baseState}
        />
        {!baseState.isLoading && !baseState.isError ? (
          <>
            <StrategicVisionOverviewTab vision={vision} axes={axes} objectives={objectives} />
            <StrategicAlertsPanel
              alerts={alerts}
              isLoading={queryStates.alerts.isLoading}
              isError={queryStates.alerts.isError}
            />
          </>
        ) : null}
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
            axes={axes}
            objectives={objectives}
            canUpdate={canUpdate}
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
          <StrategicAxesTab axes={axes} canUpdate={canUpdate} />
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
            canUpdate={canUpdate}
          />
        ) : null}
      </TabsContent>

      <TabsContent value="alignment">
        <Alert>
          <AlertDescription>Disponible prochainement.</AlertDescription>
        </Alert>
        {kpis ? (
          <p className="text-sm text-muted-foreground">
            KPI disponibles: alignement projets {Math.round(kpis.projectAlignmentRate * 100)}%.
          </p>
        ) : null}
      </TabsContent>

      <TabsContent value="history">
        <Alert>
          <AlertDescription>Disponible prochainement.</AlertDescription>
        </Alert>
      </TabsContent>
    </Tabs>
  );
}
