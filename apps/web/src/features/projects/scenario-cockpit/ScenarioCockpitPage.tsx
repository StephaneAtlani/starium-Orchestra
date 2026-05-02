'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { projectPlanning, projectRisks, projectScenarios, projectSheet } from '../constants/project-routes';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectScenarioQuery } from '../hooks/use-project-scenario-query';
import { useProjectScenariosQuery } from '../hooks/use-project-scenarios-query';
import { ScenarioCapacityAlertPanel } from './ScenarioCapacityAlertPanel';
import { ScenarioComparisonSelector } from './ScenarioComparisonSelector';
import { ScenarioRiskPanel } from './ScenarioRiskPanel';
import { ScenarioVarianceCards } from './ScenarioVarianceCards';
import { resolveDefaultComparedId, sortScenariosForCockpit } from './sort-scenarios-cockpit';

type ScenarioCockpitPageProps = {
  projectId: string;
};

export function ScenarioCockpitPage({ projectId }: ScenarioCockpitPageProps) {
  const { data: project, isLoading: projectLoading, error: projectError } = useProjectDetailQuery(projectId);
  const scenariosQuery = useProjectScenariosQuery(projectId);
  const scenarios = useMemo(
    () => scenariosQuery.data?.items ?? [],
    [scenariosQuery.data?.items],
  );

  const selectedId = useMemo(
    () => scenarios.find((s) => s.status === 'SELECTED')?.id ?? null,
    [scenarios],
  );

  const [baselineId, setBaselineId] = useState<string | null>(null);
  const [comparedId, setComparedId] = useState<string | null>(null);
  const lastSyncedSelectedRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (selectedId === null) {
      setBaselineId(null);
      setComparedId(null);
      lastSyncedSelectedRef.current = undefined;
      return;
    }
    if (lastSyncedSelectedRef.current === undefined) {
      lastSyncedSelectedRef.current = selectedId;
      setBaselineId(selectedId);
      const sorted = sortScenariosForCockpit(scenarios);
      setComparedId(resolveDefaultComparedId(sorted, selectedId));
      return;
    }
    if (lastSyncedSelectedRef.current !== selectedId) {
      lastSyncedSelectedRef.current = selectedId;
      setBaselineId(selectedId);
      const sorted = sortScenariosForCockpit(scenarios);
      setComparedId(resolveDefaultComparedId(sorted, selectedId));
    }
  }, [scenarios, selectedId]);

  const onBaselineChange = useCallback(
    (id: string) => {
      setBaselineId(id);
      const sorted = sortScenariosForCockpit(scenarios);
      setComparedId(resolveDefaultComparedId(sorted, id));
    },
    [scenarios],
  );

  const onComparedChange = useCallback((id: string) => {
    if (baselineId && id === baselineId) return;
    setComparedId(id);
  }, [baselineId]);

  const baselineDetailQuery = useProjectScenarioQuery(projectId, baselineId, Boolean(baselineId));
  const comparedDetailQuery = useProjectScenarioQuery(projectId, comparedId, Boolean(comparedId));

  if (!projectId) {
    return <p className="text-sm text-destructive">Identifiant de projet manquant.</p>;
  }

  if (projectLoading) {
    return <LoadingState rows={6} />;
  }

  if (projectError || !project) {
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertTitle>Projet introuvable</AlertTitle>
        <AlertDescription>
          Vous n’avez pas accès à ce projet ou il n’existe plus.
        </AlertDescription>
      </Alert>
    );
  }

  if (scenariosQuery.isLoading) {
    return <LoadingState rows={6} />;
  }

  if (scenariosQuery.isError) {
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertTitle>Impossible de charger les scénarios</AlertTitle>
        <AlertDescription>
          {scenariosQuery.error instanceof Error
            ? scenariosQuery.error.message
            : 'Erreur réseau ou accès refusé.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (selectedId === null) {
    return (
      <EmptyState
        title="Aucun scénario sélectionné"
        description="Désignez une baseline depuis la liste des scénarios avant d’utiliser le cockpit."
        action={
          <Link className={cn(buttonVariants({ variant: 'default', size: 'sm' }))} href={projectScenarios(projectId)}>
            Retour aux scénarios
          </Link>
        }
      />
    );
  }

  if (baselineId === null) {
    return <LoadingState rows={4} />;
  }

  const sortedPool = sortScenariosForCockpit(scenarios);
  const noComparable = resolveDefaultComparedId(sortedPool, baselineId) === null;

  if (noComparable) {
    return (
      <>
        <header className="flex flex-col gap-3">
          <Link
            href={projectScenarios(projectId)}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              '-ml-2 w-fit gap-1 text-muted-foreground hover:text-foreground',
            )}
          >
            <ChevronLeft className="size-4" />
            Scénarios
          </Link>
          <PageHeader title="Cockpit scénarios" description={project.name} />
        </header>
        <EmptyState
          title="Aucun scénario comparable"
          description="Il faut au moins deux scénarios non archivés pour comparer la baseline à une autre variante."
          action={
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))} href={projectScenarios(projectId)}>
              Liste des scénarios
            </Link>
          }
        />
      </>
    );
  }

  if (comparedId === null) {
    return <LoadingState rows={4} />;
  }

  if (comparedId === baselineId) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Comparaison invalide</AlertTitle>
        <AlertDescription>La baseline et le comparé doivent être distincts.</AlertDescription>
      </Alert>
    );
  }

  const baselineRow = scenarios.find((s) => s.id === baselineId);
  const comparedRow = scenarios.find((s) => s.id === comparedId);
  if (!baselineRow || !comparedRow) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Données incohérentes</AlertTitle>
        <AlertDescription>Scénario introuvable dans la liste du projet.</AlertDescription>
      </Alert>
    );
  }

  const detailLoading = baselineDetailQuery.isLoading || comparedDetailQuery.isLoading;
  const detailError = baselineDetailQuery.isError || comparedDetailQuery.isError;

  return (
    <>
      <header className="flex flex-col gap-5">
        <div className="space-y-3">
          <Link
            href={projectScenarios(projectId)}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              '-ml-2 w-fit gap-1 text-muted-foreground hover:text-foreground',
            )}
          >
            <ChevronLeft className="size-4" />
            Scénarios
          </Link>
          <PageHeader
            title="Cockpit scénarios"
            description={`${project.name} — comparaison de synthèses (baseline vs scénario comparé).`}
          />
        </div>
      </header>

      <Card size="sm" className="overflow-hidden shadow-sm">
        <CardHeader className="border-b border-border/60 pb-3">
          <h2 className="text-sm font-medium text-foreground">Paire comparée</h2>
          <p className="text-xs text-muted-foreground">
            Baseline et comparé sont des scénarios non archivés ; les écarts sont calculés à partir des agrégats API.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <ScenarioComparisonSelector
            scenarios={scenarios}
            baselineId={baselineId}
            comparedId={comparedId}
            onBaselineChange={onBaselineChange}
            onComparedChange={onComparedChange}
            disabled={scenariosQuery.isFetching}
          />

          <nav
            className="flex flex-wrap gap-2 border-t border-border/60 pt-4 text-xs"
            aria-label="Accès rapides cockpit"
          >
            <span className="text-muted-foreground">Accès rapides :</span>
            <Link className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'h-auto px-1 py-0')} href={projectSheet(projectId)}>
              Fiche décisionnelle (budget)
            </Link>
            <span className="text-border">|</span>
            <Link className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'h-auto px-1 py-0')} href={projectPlanning(projectId)}>
              Planning
            </Link>
            <span className="text-border">|</span>
            <Link className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'h-auto px-1 py-0')} href={projectRisks(projectId)}>
              Risques
            </Link>
            <span className="text-border">|</span>
            <Link className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'h-auto px-1 py-0')} href={projectScenarios(projectId)}>
              Liste scénarios
            </Link>
          </nav>
        </CardContent>
      </Card>

      {detailError ? (
        <Alert variant="destructive">
          <AlertTitle>Impossible de charger le détail scénario</AlertTitle>
          <AlertDescription>
            Vérifiez votre connexion ou réessayez. Les synthèses sont chargées par scénario.
          </AlertDescription>
        </Alert>
      ) : null}

      {detailLoading ? (
        <LoadingState rows={8} />
      ) : baselineDetailQuery.data && comparedDetailQuery.data ? (
        <div className="space-y-6">
          <ScenarioVarianceCards
            baselineDetail={baselineDetailQuery.data}
            comparedDetail={comparedDetailQuery.data}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <ScenarioCapacityAlertPanel projectId={projectId} compared={comparedDetailQuery.data} />
            <ScenarioRiskPanel projectId={projectId} compared={comparedDetailQuery.data} />
          </div>
        </div>
      ) : !detailError ? (
        <LoadingState rows={6} />
      ) : null}
    </>
  );
}
