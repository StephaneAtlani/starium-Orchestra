'use client';

import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProjectScenarioApi, UpdateProjectScenarioPayload } from '../types/project.types';
import { ScenarioBudgetPanel } from './ScenarioBudgetPanel';
import { ScenarioCapacityPanel } from './ScenarioCapacityPanel';
import { ScenarioOverviewPanel } from './ScenarioOverviewPanel';
import { ScenarioResourcePanel } from './ScenarioResourcePanel';
import { ScenarioRiskPanel } from './ScenarioRiskPanel';
import { ScenarioTimelinePanel } from './ScenarioTimelinePanel';

type Props = {
  projectId: string;
  scenario: ProjectScenarioApi;
  canMutate: boolean;
  /** Message pour l’alerte « Action limitée » (permission vs projet hors brouillon). */
  readOnlyNotice?: string | null;
  isUpdatePending: boolean;
  onSaveOverview: (payload: UpdateProjectScenarioPayload) => void;
  /**
   * `modalShell` : onglets type segmented (fond muted) + panneau contenu encadré — utilisé dans la modale fiche projet.
   */
  presentation?: 'default' | 'modalShell';
};

export function ScenarioWorkspaceTabs({
  projectId,
  scenario,
  canMutate,
  readOnlyNotice,
  isUpdatePending,
  onSaveOverview,
  presentation = 'default',
}: Props) {
  const isModalShell = presentation === 'modalShell';
  const panelClass = cn(
    isModalShell
      ? 'mt-4 min-w-0 rounded-xl border border-border/60 bg-background/95 p-4 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-sm sm:p-6 dark:ring-white/[0.06]'
      : 'mt-6 min-w-0',
  );

  return (
    <Tabs defaultValue="overview" className="w-full min-w-0">
      <TabsList
        variant={isModalShell ? 'default' : 'line'}
        className={
          isModalShell
            ? 'h-auto min-h-10 w-full flex-wrap justify-start gap-1 p-1.5 ring-1 ring-border/40'
            : 'h-auto min-h-9 w-full flex-wrap justify-start gap-0 p-0'
        }
      >
        <TabsTrigger value="overview">Vue d’ensemble</TabsTrigger>
        <TabsTrigger value="budget">Budget</TabsTrigger>
        <TabsTrigger value="resources">Ressources</TabsTrigger>
        <TabsTrigger value="planning">Planning</TabsTrigger>
        <TabsTrigger value="capacity">Capacité</TabsTrigger>
        <TabsTrigger value="risks">Risques</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className={panelClass}>
        <ScenarioOverviewPanel
          scenario={scenario}
          canMutate={canMutate}
          readOnlyNotice={readOnlyNotice}
          isUpdatePending={isUpdatePending}
          onSave={onSaveOverview}
        />
      </TabsContent>
      <TabsContent value="budget" className={panelClass}>
        <ScenarioBudgetPanel scenario={scenario} canMutate={canMutate} />
      </TabsContent>
      <TabsContent value="resources" className={panelClass}>
        <ScenarioResourcePanel projectId={projectId} scenario={scenario} canMutate={canMutate} />
      </TabsContent>
      <TabsContent value="planning" className={panelClass}>
        <ScenarioTimelinePanel projectId={projectId} scenario={scenario} canMutate={canMutate} />
      </TabsContent>
      <TabsContent value="capacity" className={panelClass}>
        <ScenarioCapacityPanel projectId={projectId} scenario={scenario} canMutate={canMutate} />
      </TabsContent>
      <TabsContent value="risks" className={panelClass}>
        <ScenarioRiskPanel projectId={projectId} scenario={scenario} canMutate={canMutate} />
      </TabsContent>
    </Tabs>
  );
}
