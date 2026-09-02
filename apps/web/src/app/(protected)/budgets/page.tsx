'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { BudgetsToolbar } from '@/features/budgets/components/budgets-toolbar';
import {
  BudgetsTable,
  type BudgetsTableSortKey,
} from '@/features/budgets/components/budgets-table';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { useBudgetsListFilters } from '@/features/budgets/hooks/use-budget-list-filters';
import { useBudgetExerciseOptionsQuery } from '@/features/budgets/hooks/use-budget-exercise-options-query';
import { DEFAULT_LIMIT } from '@/features/budgets/constants/budget-filters';
import { budgetDashboard, budgetImports, budgetNew } from '@/features/budgets/constants/budget-routes';
import { PermissionGate } from '@/components/PermissionGate';
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, LayoutDashboard, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExerciseReportingSummaryQuery } from '@/features/budgets/hooks/use-exercise-reporting-summary-query';
import { useExerciseBudgetsReportingQuery } from '@/features/budgets/hooks/use-exercise-budgets-reporting-query';
import { BudgetsPortfolioKpi } from '@/features/budgets/components/budgets-portfolio-kpi';
import { BudgetsPortfolioCards } from '@/features/budgets/components/budgets-portfolio-cards';
import { formatBudgetExerciseOptionLabel } from '@/features/budgets/lib/budget-exercise-option-label';
import { downloadBudgetsPortfolioCsv } from '@/features/budgets/lib/budget-portfolio-export';
import { usePermissions } from '@/hooks/use-permissions';
import { useActiveClient } from '@/hooks/use-active-client';
import { useTablePan } from '@/hooks/use-table-pan';
import type { BudgetSummaryKpi } from '@/features/budgets/types/budget-reporting.types';

/**
 * L'API `GET exercises/:id/summary` renvoie tantôt un `BudgetSummaryKpi` plat,
 * tantôt un wrapper `{ kpi }` selon la version du contrôleur. On normalise ici.
 */
function extractKpi(
  raw: BudgetSummaryKpi | { kpi: BudgetSummaryKpi } | undefined,
): BudgetSummaryKpi | undefined {
  if (!raw) return undefined;
  if ('kpi' in raw && raw.kpi) return raw.kpi;
  return raw as BudgetSummaryKpi;
}

export default function BudgetsListPage() {
  const { filters, setFilters, reset } = useBudgetsListFilters();
  const { activeClient } = useActiveClient();
  const tablePan = useTablePan();
  const { has, isLoading: permsLoading, isSuccess: permsSuccess } = usePermissions();
  const canReadBudgets = permsSuccess && has('budgets.read');
  const [sortKey, setSortKey] = useState<BudgetsTableSortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const {
    data: exerciseOptions = [],
    isLoading: exerciseOptionsLoading,
    isFetched: exerciseOptionsFetched,
  } = useBudgetExerciseOptionsQuery({
    enabled: !!activeClient?.id,
  });
  const viewMode = filters.view ?? 'table';
  const setViewMode = (mode: 'cards' | 'table') => setFilters({ view: mode });

  const selectedExerciseId = useMemo(() => {
    if (filters.exerciseId) return filters.exerciseId;
    const active = exerciseOptions.find((exercise) => exercise.status === 'ACTIVE');
    return active?.id ?? exerciseOptions[0]?.id;
  }, [exerciseOptions, filters.exerciseId]);

  /** Exercice effectif pour les requêtes — ne pas attendre la synchro URL (évite un tour de rendu + spinner). */
  const effectiveExerciseId = selectedExerciseId;

  useEffect(() => {
    if (filters.exerciseId || !selectedExerciseId) return;
    setFilters({ exerciseId: selectedExerciseId, page: 1 });
  }, [filters.exerciseId, selectedExerciseId, setFilters]);

  const reportingQueryParams = useMemo(
    () => ({
      search: filters.search,
      status: filters.status && filters.status !== 'ALL' ? filters.status : undefined,
      limit: filters.limit,
      offset: ((filters.page ?? 1) - 1) * (filters.limit ?? DEFAULT_LIMIT),
    }),
    [filters.limit, filters.page, filters.search, filters.status],
  );

  const summaryQuery = useExerciseReportingSummaryQuery(effectiveExerciseId, {
    enabled: canReadBudgets && !!effectiveExerciseId,
  });
  const budgetsQuery = useExerciseBudgetsReportingQuery(effectiveExerciseId, reportingQueryParams, {
    enabled: !!effectiveExerciseId && canReadBudgets,
  });

  const data = budgetsQuery.data;
  const consolidationKpi = extractKpi(summaryQuery.data);
  const isResolvingExercise =
    canReadBudgets && !effectiveExerciseId && (exerciseOptionsLoading || !exerciseOptionsFetched);
  const isBudgetsPending =
    !!effectiveExerciseId && canReadBudgets && budgetsQuery.isLoading && !budgetsQuery.data;
  const isLoading = isBudgetsPending || isResolvingExercise;
  const error = budgetsQuery.error ?? summaryQuery.error;

  const limit = filters.limit ?? DEFAULT_LIMIT;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(filters.page ?? 1, totalPages);
  const offset = data?.offset ?? 0;

  const selectedExercise = exerciseOptions.find((option) => option.id === effectiveExerciseId);

  const exportVisibleRows = () => {
    if (!data?.items.length) return;
    const hint = selectedExercise?.code ?? selectedExercise?.name ?? 'export';
    downloadBudgetsPortfolioCsv(data.items, hint);
  };

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          eyebrow="Pilotage › Budgets"
          title="Budgets"
          description={
            selectedExercise
              ? `Portefeuille budgétaire de l’exercice ${formatBudgetExerciseOptionLabel(selectedExercise)}.`
              : 'Sélectionnez un exercice pour piloter les budgets du client actif.'
          }
          actions={
            <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center">
              <Link
                href={budgetDashboard()}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
              >
                <LayoutDashboard className="size-4" aria-hidden />
                Dashboard
              </Link>
              <Link
                href={budgetImports()}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
              >
                <FileSpreadsheet className="size-4" aria-hidden />
                Imports
              </Link>
              <PermissionGate permission="budgets.create">
                <Link
                  href={budgetNew()}
                  className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-1.5')}
                >
                  <Plus className="size-4" aria-hidden />
                  Créer un budget
                </Link>
              </PermissionGate>
            </div>
          }
        />

        {permsLoading && (
          <div data-testid="budgets-permissions-loading" aria-live="polite" className="space-y-4">
            <LoadingState rows={1} />
          </div>
        )}

        {permsSuccess && !canReadBudgets && (
          <Alert variant="destructive">
            <AlertTitle>Accès insuffisant</AlertTitle>
            <AlertDescription>
              Vous n&apos;avez pas la permission requise pour consulter le portefeuille budgets.
            </AlertDescription>
          </Alert>
        )}

        {canReadBudgets && (
          <>
            {effectiveExerciseId && (
              <BudgetsPortfolioKpi
                kpi={consolidationKpi}
                isLoading={summaryQuery.isLoading && !summaryQuery.data}
                totalBudgets={data?.total ?? data?.items.length ?? 0}
              />
            )}

            <div className="starium-projects-toolbar-shell w-full min-w-0 overflow-hidden">
              <BudgetsToolbar
                filters={filters}
                setFilters={setFilters}
                reset={reset}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                resolvedExerciseId={effectiveExerciseId}
              />
            </div>

            {isLoading && !data && (
              <div data-testid="budgets-loading" aria-live="polite">
                <LoadingState rows={5} />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Impossible de charger le portefeuille budgets</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>{error instanceof Error ? error.message : 'Une erreur est survenue.'}</p>
                  <Button type="button" variant="outline" onClick={() => budgetsQuery.refetch()}>
                    Réessayer
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {!isLoading && !error && !effectiveExerciseId && exerciseOptionsFetched && (
              <BudgetEmptyState
                title="Aucun exercice disponible"
                description="Créez ou activez un exercice budgétaire pour afficher le portefeuille."
              />
            )}

            {!error && effectiveExerciseId && (
              <Card
                size="sm"
                className="starium-panel max-md:max-h-none max-md:border-0 max-md:bg-transparent max-md:shadow-none overflow-hidden md:max-h-[min(75vh,800px)]"
              >
                {data && data.items.length > 0 ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-2.5 sm:px-4">
                      <p className="starium-overline">Choisir un budget à consulter</p>
                      <Button type="button" variant="outline" size="sm" onClick={exportVisibleRows}>
                        <Download className="size-4" aria-hidden />
                        Exporter
                      </Button>
                    </div>
                    <CardContent
                      className={cn(
                        'min-h-0 flex-1 overflow-auto p-0 group-data-[size=sm]/card:px-0 group-data-[size=sm]/card:pt-0',
                        viewMode === 'table' &&
                          (tablePan.isPanning
                            ? 'cursor-grabbing select-none touch-none'
                            : 'cursor-grab'),
                      )}
                      ref={viewMode === 'table' ? tablePan.scrollRef : undefined}
                      onPointerDown={viewMode === 'table' ? tablePan.onPointerDown : undefined}
                    >
                      {viewMode === 'cards' ? (
                        <div className="p-3 sm:p-4">
                          <BudgetsPortfolioCards items={data.items} />
                        </div>
                      ) : (
                        <BudgetsTable
                          data={data.items}
                          exerciseId={effectiveExerciseId}
                          filters={filters}
                          setFilters={setFilters}
                          consolidation={consolidationKpi}
                          sortKey={sortKey}
                          sortOrder={sortOrder}
                          onSortChange={(key, order) => {
                            setSortKey(key);
                            setSortOrder(order);
                          }}
                        />
                      )}
                    </CardContent>
                    <CardFooter className="starium-table-footer p-0">
                      <PaginationSummary
                        offset={offset}
                        limit={data.limit}
                        total={data.total}
                        className="text-xs text-muted-foreground"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="starium-filter-chip px-2.5 py-1 text-[11.5px] disabled:opacity-40"
                          disabled={currentPage <= 1}
                          onClick={() => setFilters({ page: currentPage - 1 })}
                          data-testid="pagination-prev"
                        >
                          <ChevronLeft className="size-3.5" aria-hidden />
                          Précédent
                        </button>
                        <span className="starium-filter-chip starium-filter-chip--active px-2.5 py-1 text-[11.5px]">
                          {currentPage}
                        </span>
                        {totalPages > 1 ? (
                          <span className="px-1 text-xs text-muted-foreground">/ {totalPages}</span>
                        ) : null}
                        <button
                          type="button"
                          className="starium-filter-chip px-2.5 py-1 text-[11.5px] disabled:opacity-40"
                          disabled={currentPage >= totalPages}
                          onClick={() => setFilters({ page: currentPage + 1 })}
                          data-testid="pagination-next"
                        >
                          Suivant
                          <ChevronRight className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    </CardFooter>
                  </>
                ) : isLoading ? (
                  <CardContent className="py-8">
                    <LoadingState rows={4} />
                  </CardContent>
                ) : data && data.items.length === 0 ? (
                  <CardContent className="py-6">
                    <BudgetEmptyState
                      title="Aucun budget à afficher"
                      description="Aucun budget ne correspond aux filtres pour cet exercice."
                      action={
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={reset}>
                            Réinitialiser les filtres
                          </Button>
                          <PermissionGate permission="budgets.create">
                            <Link
                              href={budgetNew()}
                              className={buttonVariants({ variant: 'default', size: 'sm' })}
                            >
                              Créer un budget
                            </Link>
                          </PermissionGate>
                        </div>
                      }
                    />
                  </CardContent>
                ) : null}
              </Card>
            )}
          </>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
