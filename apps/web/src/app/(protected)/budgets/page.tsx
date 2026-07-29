'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { BudgetsToolbar } from '@/features/budgets/components/budgets-toolbar';
import { BudgetsTable } from '@/features/budgets/components/budgets-table';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { useBudgetsListFilters } from '@/features/budgets/hooks/use-budget-list-filters';
import { useBudgetExerciseOptionsQuery } from '@/features/budgets/hooks/use-budget-exercise-options-query';
import { DEFAULT_LIMIT } from '@/features/budgets/constants/budget-filters';
import { budgetDashboard, budgetNew } from '@/features/budgets/constants/budget-routes';
import { PermissionGate } from '@/components/PermissionGate';
import { ChevronLeft, ChevronRight, Download, LayoutDashboard, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExerciseReportingSummaryQuery } from '@/features/budgets/hooks/use-exercise-reporting-summary-query';
import { useExerciseBudgetsReportingQuery } from '@/features/budgets/hooks/use-exercise-budgets-reporting-query';
import { BudgetsPortfolioKpi } from '@/features/budgets/components/budgets-portfolio-kpi';
import { BudgetsPortfolioCards } from '@/features/budgets/components/budgets-portfolio-cards';
import { formatBudgetExerciseOptionLabel } from '@/features/budgets/lib/budget-exercise-option-label';

export default function BudgetsListPage() {
  const { filters, setFilters, reset } = useBudgetsListFilters();
  const { data: exerciseOptions = [] } = useBudgetExerciseOptionsQuery();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const selectedExerciseId = useMemo(() => {
    if (filters.exerciseId) return filters.exerciseId;
    const active = exerciseOptions.find((exercise) => exercise.status === 'ACTIVE');
    return active?.id ?? exerciseOptions[0]?.id;
  }, [exerciseOptions, filters.exerciseId]);

  useEffect(() => {
    if (!filters.exerciseId && selectedExerciseId) {
      setFilters({ exerciseId: selectedExerciseId, page: 1 });
    }
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

  const summaryQuery = useExerciseReportingSummaryQuery(selectedExerciseId);
  const budgetsQuery = useExerciseBudgetsReportingQuery(selectedExerciseId, reportingQueryParams, {
    enabled: !!selectedExerciseId,
  });

  const data = budgetsQuery.data;
  const isLoading = budgetsQuery.isLoading || (!filters.exerciseId && exerciseOptions.length > 0);
  const error = budgetsQuery.error ?? summaryQuery.error;

  const limit = filters.limit ?? DEFAULT_LIMIT;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(filters.page ?? 1, totalPages);
  const offset = data?.offset ?? 0;

  const selectedExercise = exerciseOptions.find((option) => option.id === selectedExerciseId);

  const exportVisibleRows = () => {
    if (!data?.items.length) return;
    const lines = [
      ['Budget', 'Code', 'Alloué', 'Engagé', 'Consommé', 'Reste', 'Exécution', 'État'].join(';'),
      ...data.items.map((row) =>
        [
          row.budget.name,
          row.budget.code ?? '',
          row.kpi.totalInitialAmount,
          row.kpi.totalCommittedAmount,
          row.kpi.totalConsumedAmount,
          row.kpi.totalRemainingAmount,
          row.kpi.consumptionRate != null ? Math.round(row.kpi.consumptionRate * 100) : '',
          row.budget.status,
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(';'),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `budgets-${selectedExercise?.code ?? selectedExercise?.name ?? 'export'}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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
        <BudgetsToolbar viewMode={viewMode} onViewModeChange={setViewMode} />

        {selectedExerciseId && (
          <BudgetsPortfolioKpi
            kpi={summaryQuery.data?.kpi}
            isLoading={summaryQuery.isLoading || (!summaryQuery.data && isLoading)}
          />
        )}

        {isLoading && !data && (
          <div data-testid="budgets-loading">
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

        {!isLoading && !error && !selectedExerciseId && (
          <BudgetEmptyState
            title="Aucun exercice disponible"
            description="Créez ou activez un exercice budgétaire pour afficher le portefeuille."
          />
        )}

        {!isLoading && !error && selectedExerciseId && data && data.items.length === 0 && (
          <BudgetEmptyState
            title="Aucun budget à afficher"
            description="Aucun budget ne correspond aux filtres pour cet exercice."
            action={
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={reset}>
                  Réinitialiser les filtres
                </Button>
                <PermissionGate permission="budgets.create">
                  <Link href={budgetNew()} className={buttonVariants({ variant: 'default', size: 'sm' })}>
                    Créer un budget
                  </Link>
                </PermissionGate>
              </div>
            }
          />
        )}

        {!isLoading && !error && data && data.items.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="starium-overline">Choisir un budget à consulter</p>
              <Button type="button" variant="outline" size="sm" onClick={exportVisibleRows}>
                <Download className="size-4" aria-hidden />
                Exporter
              </Button>
            </div>
            {viewMode === 'cards' ? (
              <BudgetsPortfolioCards items={data.items} />
            ) : (
              <BudgetsTable data={data.items} exerciseId={selectedExerciseId} />
            )}
            <div className="mt-3 flex items-center justify-between">
              <PaginationSummary offset={offset} limit={data.limit} total={data.total} />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setFilters({ page: currentPage - 1 })}
                  data-testid="pagination-prev"
                >
                  <ChevronLeft className="size-4" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters({ page: currentPage + 1 })}
                  data-testid="pagination-next"
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
