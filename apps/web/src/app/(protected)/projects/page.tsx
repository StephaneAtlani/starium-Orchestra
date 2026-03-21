'use client';

import Link from 'next/link';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import { useProjectsListFilters } from '@/features/projects/hooks/use-projects-list-filters';
import { useProjectsListQuery } from '@/features/projects/hooks/use-projects-list-query';
import { usePortfolioSummaryQuery } from '@/features/projects/hooks/use-portfolio-summary-query';
import { ProjectsPortfolioKpi } from '@/features/projects/components/projects-portfolio-kpi';
import { ProjectsToolbar } from '@/features/projects/components/projects-toolbar';
import { ProjectsListTable } from '@/features/projects/components/projects-list-table';
import { projectNew } from '@/features/projects/constants/project-routes';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export default function ProjectsPortfolioPage() {
  const { filters, setFilters, apiParams } = useProjectsListFilters();
  const { data, isLoading, error } = useProjectsListQuery(apiParams);
  const { data: summary, isLoading: summaryLoading } = usePortfolioSummaryQuery();

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
          description="Cockpit portefeuille — pilotage et signaux par client actif."
          actions={
            <PermissionGate permission="projects.create">
              <Link
                href={projectNew()}
                className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
              >
                <Plus className="size-4" />
                Nouveau projet
              </Link>
            </PermissionGate>
          }
        />

        <ProjectsPortfolioKpi summary={summary} isLoading={summaryLoading} />

        <ProjectsToolbar filters={filters} setFilters={setFilters} />

        {isLoading && (
          <div data-testid="projects-loading">
            <LoadingState rows={5} />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">
            Impossible de charger les projets.
          </p>
        )}

        {!isLoading && !error && data && data.items.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun projet sur ce périmètre.</p>
        )}

        {!isLoading && !error && data && data.items.length > 0 && (
          <>
            <ProjectsListTable items={data.items} />
            <div className="mt-3 flex items-center justify-between">
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
            </div>
          </>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
