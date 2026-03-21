'use client';

import Link from 'next/link';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { projectNew } from '@/features/projects/constants/project-routes';
import type { ApiFormError } from '@/features/budgets/api/types';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export default function ProjectsPortfolioPage() {
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } =
    usePermissions();
  const canReadProjects = has('projects.read');
  const listEnabled = !!clientId && permsSuccess && canReadProjects;

  const { filters, setFilters, apiParams } = useProjectsListFilters();
  const { data, isLoading, error, refetch, isRefetching } = useProjectsListQuery(apiParams, {
    enabled: listEnabled,
  });
  const { data: summary, isLoading: summaryLoading } = usePortfolioSummaryQuery({
    enabled: listEnabled,
  });

  const apiErr = error ? (error as unknown as ApiFormError) : undefined;

  const limit = filters.limit;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(filters.page, totalPages);
  const offset = data ? (data.page - 1) * data.limit : 0;

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Projets"
          description="Cockpit portefeuille — pilotage et signaux pour le client actif."
          actions={
            <PermissionGate permission="projects.create">
              <Link
                href={projectNew()}
                className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
              >
                <Plus className="size-4" />
                Nouveau projet
              </Link>
            </PermissionGate>
          }
        />

        {clientId && permsLoading && (
          <div data-testid="projects-perms-loading">
            <LoadingState rows={2} />
          </div>
        )}

        {clientId && permsError && !permsLoading && (
          <p className="text-sm text-destructive">
            Impossible de charger vos permissions pour ce client.
          </p>
        )}

        {clientId && permsSuccess && !canReadProjects && (
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Votre rôle n&apos;inclut pas la permission{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">projects.read</code> pour ce client.
            Demandez à un administrateur client d&apos;ajuster votre rôle.
          </p>
        )}

        {clientId && permsSuccess && canReadProjects && (
          <>
            <ProjectsPortfolioKpi summary={summary} isLoading={summaryLoading} />

            <ProjectsToolbar filters={filters} setFilters={setFilters} />

            {isLoading && (
              <div data-testid="projects-loading">
                <LoadingState rows={5} />
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                <p className="font-medium text-destructive">
                  {apiErr?.message ?? 'Impossible de charger les projets.'}
                </p>
                {apiErr?.status != null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Code HTTP : <code className="rounded bg-muted px-1">{apiErr.status}</code>
                  </p>
                )}
                {apiErr?.status === 403 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Accès refusé par l&apos;API (module désactivé pour ce client, ou permissions
                    insuffisantes). Vérifiez en administration que le module{' '}
                    <strong>Projets</strong> est <strong>activé</strong> pour ce client et que
                    votre rôle inclut{' '}
                    <code className="rounded bg-muted px-1">projects.read</code>.
                  </p>
                )}
                {apiErr?.status === 404 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Un <strong>404</strong> sur <code className="rounded bg-muted px-1">GET /api/projects</code>{' '}
                    indique en général que la route n&apos;existe pas sur le serveur API (binaire pas à
                    jour, mauvaise <code className="rounded bg-muted px-1">NEXT_PUBLIC_API_URL</code>,
                    ou proxy). Ce n&apos;est <strong>pas</strong> typiquement un problème de rôle dans
                    la base : dans ce cas l&apos;API répondrait plutôt en <strong>403</strong>.
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={isRefetching}
                  onClick={() => refetch()}
                >
                  {isRefetching ? 'Chargement…' : 'Réessayer'}
                </Button>
              </div>
            )}

            {!isLoading && !error && data && data.items.length === 0 && (
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
            )}

            {!isLoading && !error && data && data.items.length > 0 && (
              <Card size="sm" className="overflow-hidden shadow-sm">
                <CardHeader className="border-b border-border/60 pb-3">
                  <CardTitle className="text-sm font-medium">Liste des projets</CardTitle>
                  <CardDescription>
                    Sélectionnez un projet pour ouvrir la fiche (jalons, risques, tâches).
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-0 pt-0">
                  <div data-slot="table-container" className="overflow-x-auto">
                    <ProjectsListTable items={data.items} />
                  </div>
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
              </Card>
            )}
          </>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
