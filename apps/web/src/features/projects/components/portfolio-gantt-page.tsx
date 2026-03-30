'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CalendarRange, ChevronLeft } from 'lucide-react';
import { useProjectsListFilters } from '../hooks/use-projects-list-filters';
import { usePortfolioGanttQuery } from '../hooks/use-portfolio-gantt-query';
import { ProjectsToolbar } from './projects-toolbar';
import { PortfolioGanttChart } from './portfolio-gantt-chart';
import { projectsList } from '../constants/project-routes';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';

export function PortfolioGanttPage() {
  const { has } = usePermissions();
  const canRead = has('projects.read');
  const { filters, setFilters, reset, apiParams } = useProjectsListFilters();
  const { data, isLoading, isError, error, refetch } = usePortfolioGanttQuery(apiParams, {
    enabled: canRead,
  });

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
                  <PortfolioGanttChart items={data.items} />
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
