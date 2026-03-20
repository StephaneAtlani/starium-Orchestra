'use client';

import React, { useRef } from 'react';
import { Layers } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import { useBudgetDashboardPage } from './hooks/use-budget-dashboard-page';
import { BudgetDashboardShell } from './components/budget-dashboard-shell';
import { BudgetDashboardSkeleton } from './components/budget-dashboard-skeleton';
import { BudgetDashboardEmptyState } from './components/budget-dashboard-empty-state';
import { BudgetDashboardErrorState } from './components/budget-dashboard-error-state';
import { BudgetDashboardHeader } from './components/budget-dashboard-header';
import { BudgetKpiGrid } from './components/budget-kpi-grid';
import { BudgetAlertsPanel } from './components/budget-alerts-panel';
import { BudgetAnalyticsGrid } from './components/budget-analytics-grid';
import { BudgetTopEnvelopesCard } from './components/budget-top-envelopes-card';
import { BudgetEnvelopesTable } from './components/budget-envelopes-table';
import { BudgetLinesCritiqueTable } from './components/budget-lines-critique-table';
import { BudgetTopBudgetLinesCard } from './components/budget-top-budget-lines-card';
import { CockpitSurfaceCard } from './components/budget-cockpit-primitives';

export function BudgetDashboardPage() {
  const criticalRef = useRef<HTMLDivElement>(null);
  const scrollToCritical = () => {
    criticalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const {
    exerciseId,
    budgetId,
    exerciseSelectLabel,
    budgetSelectLabel,
    onExerciseChange,
    onBudgetChange,
    refresh,
    data,
    isLoading,
    isFetching,
    error,
    exercises,
    exercisesLoading,
    budgets,
    budgetsLoading,
  } = useBudgetDashboardPage();

  const {
    taxDisplayMode,
    setTaxDisplayMode,
    isLoading: taxDisplayLoading,
    defaultTaxRate,
  } = useTaxDisplayMode();

  const err = error instanceof Error ? error : null;

  return (
    <RequireActiveClient>
      <PageContainer>
        {isLoading && <BudgetDashboardSkeleton />}

        {!isLoading && err && (
          <BudgetDashboardErrorState
            message={err.message || 'Impossible de charger le cockpit budget.'}
            onRetry={refresh}
          />
        )}

        {!isLoading && !err && !data && <BudgetDashboardEmptyState />}

        {!isLoading && !err && data && (
          <BudgetDashboardShell data-testid="budget-dashboard-content">
            <BudgetDashboardHeader
              exercises={exercises}
              budgets={budgets}
              exerciseId={exerciseId}
              budgetId={budgetId}
              exerciseSelectLabel={exerciseSelectLabel}
              budgetSelectLabel={budgetSelectLabel}
              exercisesLoading={exercisesLoading}
              budgetsLoading={budgetsLoading}
              onExerciseChange={onExerciseChange}
              onBudgetChange={onBudgetChange}
              onRefresh={refresh}
              isFetching={isFetching}
              taxDisplayMode={taxDisplayMode}
              onTaxDisplayModeChange={setTaxDisplayMode}
              taxDisplayLoading={taxDisplayLoading}
            />

            <CockpitSurfaceCard
              title="Périmètre sélectionné"
              description="Exercice et budget actifs pour toutes les métriques ci-dessous."
              icon={Layers}
              accent="primary"
            >
              <dl className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Exercice
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {data.exercise.name}
                    {data.exercise.code ? (
                      <span className="font-normal text-muted-foreground">
                        {' '}
                        ({data.exercise.code})
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Budget
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {data.budget.name}
                    {data.budget.code ? (
                      <span className="font-normal text-muted-foreground">
                        {' '}
                        ({data.budget.code})
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Devise
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                    {data.budget.currency}
                  </dd>
                </div>
              </dl>
            </CockpitSurfaceCard>

            <BudgetKpiGrid
              data={data}
              taxDisplayMode={taxDisplayMode}
              defaultTaxRate={defaultTaxRate}
            />

            <BudgetAlertsPanel
              alertsSummary={data.alertsSummary}
              onViewCriticalLines={scrollToCritical}
            />

            <BudgetAnalyticsGrid
              data={data}
              taxDisplayMode={taxDisplayMode}
              defaultTaxRate={defaultTaxRate}
            />

            {data.topEnvelopes && data.topEnvelopes.length > 0 && (
              <BudgetTopEnvelopesCard
                rows={data.topEnvelopes}
                currency={data.budget.currency}
                taxDisplayMode={taxDisplayMode}
                defaultTaxRate={defaultTaxRate}
                onRowClick={scrollToCritical}
              />
            )}

            {data.riskEnvelopes && data.riskEnvelopes.length > 0 && (
              <BudgetEnvelopesTable
                rows={data.riskEnvelopes}
                currency={data.budget.currency}
                taxDisplayMode={taxDisplayMode}
                defaultTaxRate={defaultTaxRate}
                onRowClick={scrollToCritical}
              />
            )}

            <div ref={criticalRef}>
              {data.criticalBudgetLines && (
                <BudgetLinesCritiqueTable
                  rows={data.criticalBudgetLines}
                  currency={data.budget.currency}
                  budgetId={data.budget.id}
                  taxDisplayMode={taxDisplayMode}
                  defaultTaxRate={defaultTaxRate}
                />
              )}
            </div>

            {data.topBudgetLines && data.topBudgetLines.length > 0 && (
              <BudgetTopBudgetLinesCard
                rows={data.topBudgetLines}
                currency={data.budget.currency}
                taxDisplayMode={taxDisplayMode}
                defaultTaxRate={defaultTaxRate}
              />
            )}
          </BudgetDashboardShell>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
