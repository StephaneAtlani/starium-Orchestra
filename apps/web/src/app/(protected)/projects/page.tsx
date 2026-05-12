'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PermissionGate } from '@/components/PermissionGate';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import { useProjectsListFilters } from '@/features/projects/hooks/use-projects-list-filters';
import { useProjectsListQuery } from '@/features/projects/hooks/use-projects-list-query';
import { usePortfolioSummaryQuery } from '@/features/projects/hooks/use-portfolio-summary-query';
import { ProjectsPortfolioKpi } from '@/features/projects/components/projects-portfolio-kpi';
import { ProjectsToolbar } from '@/features/projects/components/projects-toolbar';
import { ProjectsListTable } from '@/features/projects/components/projects-list-table';
import { ProjectsListKanban } from '@/features/projects/components/projects-list-kanban';
import {
  projectNew,
  projectsCommitteeCodir,
  projectsPortfolioGantt,
} from '@/features/projects/constants/project-routes';
import type { ApiFormError } from '@/features/budgets/api/types';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  AlertCircle,
  AlertTriangle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Plus,
  Presentation,
} from 'lucide-react';
import { useTablePan } from '@/hooks/use-table-pan';
import { useUpdateProjectStatus } from '@/features/projects/hooks/use-update-project-status';

const PROJECTS_VIEW_MODE_STORAGE_KEY = 'starium.projects.viewMode';

export default function ProjectsPortfolioPage() {
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const tablePan = useTablePan();
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } =
    usePermissions();
  const canReadProjects = has('projects.read');
  const canUpdateProjects = has('projects.update');
  const listEnabled = !!clientId && permsSuccess && canReadProjects;
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  const { filters, setFilters, reset, apiParams } = useProjectsListFilters();
  const { data, isLoading, error, refetch, isRefetching } = useProjectsListQuery(apiParams, {
    enabled: listEnabled,
  });
  const updateStatusMutation = useUpdateProjectStatus(apiParams);
  const { data: summary, isLoading: summaryLoading } = usePortfolioSummaryQuery({
    enabled: listEnabled,
  });

  const apiErr = error ? (error as unknown as ApiFormError) : undefined;

  const limit = filters.limit;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(filters.page, totalPages);
  const offset = data ? (data.page - 1) * data.limit : 0;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PROJECTS_VIEW_MODE_STORAGE_KEY);
      if (stored === 'table' || stored === 'kanban') {
        setViewMode(stored);
      }
    } catch {
      // ignore localStorage failures
    }
  }, []);

  const handleViewModeChange = (nextMode: 'table' | 'kanban') => {
    setViewMode(nextMode);
    try {
      window.localStorage.setItem(PROJECTS_VIEW_MODE_STORAGE_KEY, nextMode);
    } catch {
      // ignore localStorage failures
    }
  };

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Projets"
          description="Cockpit portefeuille — pilotage et signaux pour le client actif."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {permsSuccess && canReadProjects && (
                <>
                  <Link
                    href={projectsCommitteeCodir()}
                    className={cn(
                      buttonVariants({ variant: 'default', size: 'sm' }),
                      'gap-1.5',
                    )}
                  >
                    <Presentation className="size-4" />
                    Présentation CODIR
                  </Link>
                  <Link
                    href={projectsPortfolioGantt()}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'gap-1.5 border-primary/45 text-primary hover:border-primary/70 hover:bg-primary/10 hover:text-primary',
                    )}
                  >
                    <CalendarRange className="size-4" />
                    Gantt portefeuille
                  </Link>
                </>
              )}
              <PermissionGate permission="projects.create">
                <Link
                  href={projectNew()}
                  className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
                >
                  <Plus className="size-4" />
                  Nouveau projet
                </Link>
              </PermissionGate>
            </div>
          }
        />

        {clientId && permsLoading && (
          <div data-testid="projects-perms-loading">
            <LoadingState rows={2} />
          </div>
        )}

        {clientId && permsError && !permsLoading && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Permissions indisponibles</AlertTitle>
            <AlertDescription>
              Impossible de charger vos permissions pour ce client.
            </AlertDescription>
          </Alert>
        )}

        {clientId && permsSuccess && !canReadProjects && (
          <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-950 dark:text-amber-100">
              Accès au module Projets
            </AlertTitle>
            <AlertDescription className="text-amber-950/90 dark:text-amber-100/90">
              Votre rôle n&apos;inclut pas la permission{' '}
              <code className="rounded bg-background/60 px-1.5 py-0.5 text-xs font-mono">
                projects.read
              </code>{' '}
              pour ce client. Demandez à un administrateur client d&apos;ajuster votre rôle.
            </AlertDescription>
          </Alert>
        )}

        {clientId && permsSuccess && canReadProjects && (
          <>
            <ProjectsPortfolioKpi summary={summary} isLoading={summaryLoading} />

            {isLoading && !data && (
              <div data-testid="projects-loading">
                <LoadingState rows={5} />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>
                  {apiErr?.message ?? 'Impossible de charger les projets.'}
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  {apiErr?.status != null && (
                    <p className="text-xs text-muted-foreground">
                      Code HTTP :{' '}
                      <code className="rounded bg-background/50 px-1 font-mono">{apiErr.status}</code>
                    </p>
                  )}
                  {apiErr?.status === 403 && (
                    <p>
                      Accès refusé par l&apos;API (module désactivé pour ce client, ou permissions
                      insuffisantes). Vérifiez en administration que le module{' '}
                      <strong>Projets</strong> est <strong>activé</strong> pour ce client et que
                      votre rôle inclut{' '}
                      <code className="rounded bg-background/50 px-1 font-mono text-xs">
                        projects.read
                      </code>
                      .{' '}
                      <Link
                        href="/client/help/access-model"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Modèle d&apos;accès actuel (aide)
                      </Link>
                    </p>
                  )}
                  {apiErr?.status === 404 && (
                    <p>
                      Un <strong>404</strong> sur{' '}
                      <code className="rounded bg-background/50 px-1 font-mono text-xs">
                        GET /api/projects
                      </code>{' '}
                      indique en général que la route n&apos;existe pas sur le serveur API (binaire
                      pas à jour, mauvaise{' '}
                      <code className="rounded bg-background/50 px-1 font-mono text-xs">
                        NEXT_PUBLIC_API_URL
                      </code>
                      , ou proxy). Ce n&apos;est <strong>pas</strong> typiquement un problème de rôle
                      dans la base : dans ce cas l&apos;API répondrait plutôt en <strong>403</strong>.
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 border-destructive/40"
                    disabled={isRefetching}
                    onClick={() => refetch()}
                  >
                    {isRefetching ? 'Chargement…' : 'Réessayer'}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {!error && (
              <Card size="sm" className="max-h-[min(75vh,800px)] overflow-hidden shadow-sm">
                <ProjectsToolbar
                  filters={filters}
                  setFilters={setFilters}
                  onReset={reset}
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                  embedded
                />
                {data && data.items.length > 0 ? (
                  <>
                    <CardContent
                      className={cn(
                        'min-h-0 flex-1 overflow-auto p-0 group-data-[size=sm]/card:px-0 group-data-[size=sm]/card:pt-0',
                        viewMode === 'table' &&
                          (tablePan.isPanning ? 'cursor-grabbing select-none' : 'cursor-grab'),
                      )}
                      ref={viewMode === 'table' ? tablePan.scrollRef : undefined}
                      onMouseDown={viewMode === 'table' ? tablePan.onMouseDown : undefined}
                    >
                      {viewMode === 'table' ? (
                        <ProjectsListTable
                          items={data.items}
                          filters={filters}
                          setFilters={setFilters}
                        />
                      ) : (
                        <ProjectsListKanban
                          items={data.items}
                          statusFilter={filters.status}
                          canUpdate={canUpdateProjects}
                          isUpdating={updateStatusMutation.isPending}
                          onStatusDrop={({ projectId, fromStatus, toStatus }) => {
                            if (!canUpdateProjects) return;
                            if (fromStatus === toStatus) return;
                            updateStatusMutation.mutate({ projectId, targetStatus: toStatus });
                          }}
                        />
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <PaginationSummary offset={offset} limit={data.limit} total={data.total} />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage <= 1}
                          onClick={() => setFilters({ page: currentPage - 1 })}
                          data-testid="projects-pagination-prev"
                        >
                          <ChevronLeft className="size-4" />
                          Précédent
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => setFilters({ page: currentPage + 1 })}
                          data-testid="projects-pagination-next"
                        >
                          Suivant
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </>
                ) : isLoading ? (
                  <CardContent className="py-8">
                    <LoadingState rows={4} />
                  </CardContent>
                ) : (
                  <CardContent className="py-10">
                    <EmptyState
                      title="Aucun projet"
                      description="Aucun projet ne correspond à ce périmètre. Élargissez les filtres ou créez un nouveau projet."
                      action={
                        has('projects.create') ? (
                          <Link
                            href={projectNew()}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                          >
                            Nouveau projet
                          </Link>
                        ) : undefined
                      }
                    />
                  </CardContent>
                )}
              </Card>
            )}
          </>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
