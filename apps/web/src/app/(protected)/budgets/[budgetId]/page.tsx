'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetKpiCards } from '@/features/budgets/components/budget-kpi-cards';
import { BudgetErrorState } from '@/features/budgets/components/budget-error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { useBudgetDetail } from '@/features/budgets/hooks/use-budgets';
import { useBudgetSummary } from '@/features/budgets/hooks/use-budget-summary';
import { budgetLines, budgetReporting, budgetSnapshots, budgetVersions, budgetReallocations } from '@/features/budgets/constants/budget-routes';
import { BudgetStatusBadge } from '@/features/budgets/components/budget-status-badge';
import { formatAmount } from '@/features/budgets/lib/budget-formatters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BudgetDetailPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : null;
  const { data: budget, isLoading: budgetLoading, error: budgetError, refetch } = useBudgetDetail(budgetId);
  const { data: summary } = useBudgetSummary(budgetId);

  if (budgetLoading) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <BudgetPageHeader title="Budget" description="Chargement…" />
          <LoadingState rows={3} />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  if (budgetError || !budget) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <BudgetPageHeader title="Budget" />
          <BudgetErrorState
            message={budgetError instanceof Error ? budgetError.message : 'Budget non trouvé.'}
            onRetry={() => void refetch()}
          />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  const kpi = summary?.kpi;
  const currency = budget.currency;
  const kpiItems = kpi
    ? [
        { label: 'Initial', value: formatAmount(kpi.totalInitialAmount, currency) },
        { label: 'Révisé', value: formatAmount(kpi.totalRevisedAmount, currency) },
        { label: 'Engagé', value: formatAmount(kpi.totalCommittedAmount, currency) },
        { label: 'Consommé', value: formatAmount(kpi.totalConsumedAmount, currency) },
        { label: 'Restant', value: formatAmount(kpi.totalRemainingAmount, currency) },
      ]
    : [];

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title={budget.name}
          description={
            budget.code ? `${budget.code} · ${budget.currency}` : budget.currency
          }
        />

        <div className="mb-4">
          <BudgetStatusBadge status={budget.status} />
        </div>

        {kpiItems.length > 0 && (
          <BudgetKpiCards items={kpiItems} className="mb-6" />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accès rapides</CardTitle>
            <CardDescription>Sous-domaines du budget.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href={budgetLines(budgetId!)} className="text-sm font-medium text-primary hover:underline">
              Lignes
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href={budgetReporting(budgetId!)} className="text-sm font-medium text-primary hover:underline">
              Reporting
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href={budgetSnapshots(budgetId!)} className="text-sm font-medium text-primary hover:underline">
              Snapshots
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href={budgetVersions(budgetId!)} className="text-sm font-medium text-primary hover:underline">
              Versions
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href={budgetReallocations(budgetId!)} className="text-sm font-medium text-primary hover:underline">
              Réallocations
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    </RequireActiveClient>
  );
}
