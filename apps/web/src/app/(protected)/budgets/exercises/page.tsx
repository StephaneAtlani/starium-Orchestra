'use client';

import React from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetExercisesToolbar } from '@/features/budgets/components/budget-exercises-toolbar';
import { BudgetExercisesTable } from '@/features/budgets/components/budget-exercises-table';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';
import { BudgetErrorState } from '@/features/budgets/components/budget-error-state';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { useBudgetExercisesListFilters } from '@/features/budgets/hooks/use-budget-list-filters';
import { useBudgetExercisesQuery } from '@/features/budgets/hooks/use-budget-exercises-query';
import { DEFAULT_LIMIT } from '@/features/budgets/constants/budget-filters';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function BudgetExercisesPage() {
  const { filters, setFilters } = useBudgetExercisesListFilters();
  const { data, isLoading, error, refetch } = useBudgetExercisesQuery(filters);

  const limit = filters.limit ?? DEFAULT_LIMIT;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(filters.page ?? 1, totalPages);
  const offset = data?.offset ?? 0;

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Exercices budgétaires"
          description="Liste des exercices du client actif."
        />
        <BudgetExercisesToolbar />

        {isLoading && (
          <div data-testid="budget-exercises-loading">
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
            title="Aucun exercice budgétaire trouvé."
            description="Ajustez les filtres ou créez un exercice pour commencer."
          />
        )}

        {!isLoading && !error && data && data.items.length > 0 && (
          <>
            <BudgetExercisesTable data={data.items} />
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
