'use client';

import React from 'react';
import Link from 'next/link';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetToolbar } from '@/features/budgets/components/budget-toolbar';
import { BudgetListTable } from '@/features/budgets/components/budget-list-table';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';
import { BudgetErrorState } from '@/features/budgets/components/budget-error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { useBudgetExercisesList } from '@/features/budgets/hooks/use-budget-exercises';
import { budgetExerciseDetail } from '@/features/budgets/constants/budget-routes';
import { BudgetStatusBadge } from '@/features/budgets/components/budget-status-badge';
import type { BudgetExercise } from '@/features/budgets/types/budget-management.types';

export default function BudgetExercisesPage() {
  const { data, isLoading, error, refetch } = useBudgetExercisesList();

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Exercices budgétaires"
          description="Liste des exercices du client actif."
        />
        <BudgetToolbar />

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
            title="Aucun exercice"
            description="Créez un exercice budgétaire pour commencer."
          />
        )}

        {!isLoading && !error && data && data.items.length > 0 && (
          <BudgetListTable<BudgetExercise>
            data-testid="budget-exercises-table"
            columns={[
              {
                key: 'name',
                header: 'Nom',
                render: (row) => (
                  <Link href={budgetExerciseDetail(row.id)} className="font-medium text-primary hover:underline">
                    {row.name}
                  </Link>
                ),
              },
              { key: 'code', header: 'Code', render: (row) => row.code ?? '—' },
              {
                key: 'dates',
                header: 'Période',
                render: (row) => `${row.startDate} → ${row.endDate}`,
              },
              {
                key: 'status',
                header: 'Statut',
                render: (row) => <BudgetStatusBadge status={row.status} />,
              },
            ]}
            data={data.items}
            keyExtractor={(row) => row.id}
            emptyMessage="Aucun exercice."
          />
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
