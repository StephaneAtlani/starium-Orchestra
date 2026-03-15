'use client';

import React from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetsToolbar } from '@/features/budgets/components/budgets-toolbar';
import { BudgetsTable } from '@/features/budgets/components/budgets-table';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';
import { BudgetErrorState } from '@/features/budgets/components/budget-error-state';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { useBudgetsListFilters } from '@/features/budgets/hooks/use-budget-list-filters';
import { useBudgetsQuery } from '@/features/budgets/hooks/use-budgets-query';
import { useBudgetExerciseOptionsQuery } from '@/features/budgets/hooks/use-budget-exercise-options-query';
import { DEFAULT_LIMIT } from '@/features/budgets/constants/budget-filters';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function BudgetsListPage() {
  const { filters, setFilters } = useBudgetsListFilters();
  const { data, isLoading, error, refetch } = useBudgetsQuery(filters);
  const { data: exerciseOptions = [] } = useBudgetExerciseOptionsQuery();

  const limit = filters.limit ?? DEFAULT_LIMIT;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(filters.page ?? 1, totalPages);
  const offset = data?.offset ?? 0;

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Budgets"
          description="Liste des budgets du client actif."
        />
        <BudgetsToolbar />

        {isLoading && (
          <div data-testid="budgets-loading">
            <LoadingState rows={5} />
          </div>
        )}

        {error && (
          <BudgetErrorState
            message={error instanceof Error ? error.message : 'Erreur lors du chargement.'}
            onRetry={() => void refetch()}
          />
        )}

        {!isLoading && !error && data && data.items.length === 0 && (
          <BudgetEmptyState
            title="Aucun budget trouvé."
            description="Ajustez les filtres ou créez un budget pour commencer."
          />
        )}

        {!isLoading && !error && data && data.items.length > 0 && (
          <>
            <BudgetsTable data={data.items} exerciseOptions={exerciseOptions} />
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
