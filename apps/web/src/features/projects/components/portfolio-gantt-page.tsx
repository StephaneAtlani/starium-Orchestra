'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CalendarRange, ChevronLeft } from 'lucide-react';
import { useProjectsListFilters } from '../hooks/use-projects-list-filters';
import { usePortfolioGanttQuery } from '../hooks/use-portfolio-gantt-query';
import { ProjectsToolbar } from './projects-toolbar';
import { ProjectsPortfolioFiltersBar } from './projects-portfolio-filters-bar';
import { PortfolioGanttChart } from './portfolio-gantt-chart';
import { projectsList } from '../constants/project-routes';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';

const PORTFOLIO_GANTT_TIME_ZOOM_MIN = 0.2;
const PORTFOLIO_GANTT_TIME_ZOOM_MAX = 5;
const PORTFOLIO_GANTT_TIME_ZOOM_STEP = 1.12;

function clampPortfolioTimeZoom(z: number): number {
  return Math.min(PORTFOLIO_GANTT_TIME_ZOOM_MAX, Math.max(PORTFOLIO_GANTT_TIME_ZOOM_MIN, z));
}

export function PortfolioGanttPage() {
  const { has } = usePermissions();
  const canRead = has('projects.read');
  const { filters, setFilters, reset, apiParams } = useProjectsListFilters();
  const { data, isLoading, isError, error, refetch } = usePortfolioGanttQuery(apiParams, {
    enabled: canRead,
  });

  const [showPortfolioGanttTooltips, setShowPortfolioGanttTooltips] = useState(true);
  /** 100 % = densité qui remplit la largeur visible de la frise. */
  const [portfolioTimeZoom, setPortfolioTimeZoom] = useState(1);

  const zoomTimeIn = useCallback(() => {
    setPortfolioTimeZoom((z) => clampPortfolioTimeZoom(z * PORTFOLIO_GANTT_TIME_ZOOM_STEP));
  }, []);
  const zoomTimeOut = useCallback(() => {
    setPortfolioTimeZoom((z) => clampPortfolioTimeZoom(z / PORTFOLIO_GANTT_TIME_ZOOM_STEP));
  }, []);
  const resetTimeZoom = useCallback(() => setPortfolioTimeZoom(1), []);

  const myRoleOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of data?.items ?? []) {
      for (const r of row.myRoles ?? []) {
        const t = r.trim();
        if (t) set.add(t);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [data?.items]);

  return (
    <>
      <PageHeader
        title="Gantt portefeuille"
        description="Vue temporelle de tous les projets du client actif — mêmes filtres que la liste."
        actions={
          <Link
            href={projectsList()}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <ChevronLeft className="size-4" />
            Liste projets
          </Link>
        }
      />

      {!canRead ? (
        <Alert>
          <AlertTitle>Permission requise</AlertTitle>
          <AlertDescription>
            La permission <code className="text-xs">projects.read</code> est nécessaire.
          </AlertDescription>
        </Alert>
      ) : (
        <Card size="sm" className="min-w-0 overflow-hidden shadow-sm">
          <ProjectsToolbar filters={filters} setFilters={setFilters} onReset={reset} embedded />
          <ProjectsPortfolioFiltersBar
            filters={filters}
            setFilters={setFilters}
            myRoleOptions={myRoleOptions}
            portfolioGanttZoom={{
              value: portfolioTimeZoom,
              onZoomOut: zoomTimeOut,
              onZoomIn: zoomTimeIn,
              onReset: resetTimeZoom,
            }}
            portfolioGanttTooltips={{
              enabled: showPortfolioGanttTooltips,
              onEnabledChange: setShowPortfolioGanttTooltips,
            }}
          />
          <CardContent className="p-4 sm:p-6">
            {isLoading && !data && <LoadingState rows={5} />}
            {isError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-2">
                  {error instanceof Error ? error.message : 'Chargement impossible.'}
                  <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>
                    Réessayer
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {!isLoading && !isError && data && (
              <>
                {data.items.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Aucun projet ne correspond aux filtres. Élargissez la recherche ou réinitialisez.
                  </p>
                ) : (
                  <PortfolioGanttChart
                    items={data.items}
                    timeZoom={portfolioTimeZoom}
                    onTimeZoomChange={setPortfolioTimeZoom}
                    tooltipsEnabled={showPortfolioGanttTooltips}
                  />
                )}
                <p className="text-muted-foreground mt-4 text-xs">
                  <CalendarRange className="mr-1 inline size-3.5 align-text-bottom opacity-70" />
                  Une barre par projet (dates début / fin cible). Le détail des tâches reste dans le{' '}
                  <Link className="text-primary underline-offset-2 hover:underline" href={projectsList()}>
                    planning
                  </Link>{' '}
                  de chaque projet.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
