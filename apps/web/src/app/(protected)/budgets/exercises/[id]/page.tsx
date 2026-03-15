'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetErrorState } from '@/features/budgets/components/budget-error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { useBudgetExerciseSummary } from '@/features/budgets/hooks/use-budget-exercises';
import { useBudgetsList } from '@/features/budgets/hooks/use-budgets';
import { budgetDetail, budgetExerciseEdit } from '@/features/budgets/constants/budget-routes';
import { BudgetStatusBadge } from '@/features/budgets/components/budget-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BudgetExerciseDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : null;
  const { data: exercise, isLoading: exerciseLoading, error: exerciseError, refetch } = useBudgetExerciseSummary(id);
  const { data: budgetsData } = useBudgetsList(id ? { exerciseId: id } : undefined);

  if (exerciseLoading) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <BudgetPageHeader title="Exercice" description="Chargement…" />
          <LoadingState rows={3} />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  if (exerciseError || !exercise) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <BudgetPageHeader title="Exercice" />
          <BudgetErrorState
            message={exerciseError instanceof Error ? exerciseError.message : 'Exercice non trouvé.'}
            onRetry={() => void refetch()}
          />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  const budgets = budgetsData?.items ?? [];

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title={exercise.name}
          description={exercise.code ? `Code : ${exercise.code}` : undefined}
          actions={
            id ? (
              <Link
                href={budgetExerciseEdit(id)}
                className="inline-flex h-7 items-center justify-center rounded-md border border-input bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
              >
                Modifier
              </Link>
            ) : undefined
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Période</CardTitle>
            <CardDescription>
              {exercise.startDate} → {exercise.endDate} · <BudgetStatusBadge status={exercise.status} />
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Budgets</CardTitle>
            <CardDescription>Budgets de cet exercice.</CardDescription>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun budget pour cet exercice.</p>
            ) : (
              <ul className="space-y-2">
                {budgets.map((b) => (
                  <li key={b.id}>
                    <Link href={budgetDetail(b.id)} className="font-medium text-primary hover:underline">
                      {b.name}
                      {b.code ? ` (${b.code})` : ''}
                    </Link>
                    {' · '}
                    <BudgetStatusBadge status={b.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </RequireActiveClient>
  );
}
