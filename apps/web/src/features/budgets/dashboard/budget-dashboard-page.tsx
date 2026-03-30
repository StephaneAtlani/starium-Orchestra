'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currency-format';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import {
  BudgetLineIntelligenceDrawer,
  type BudgetLineDrawerTab,
} from '@/features/budgets/components/budget-line-drawer/budget-line-intelligence-drawer';
import { BudgetEnvelopeIntelligenceDrawer } from '@/features/budgets/components/budget-envelope-drawer/budget-envelope-intelligence-drawer';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import { useBudgetDashboardPage } from './hooks/use-budget-dashboard-page';
import { BudgetDashboardShell } from './components/budget-dashboard-shell';
import { BudgetDashboardSkeleton } from './components/budget-dashboard-skeleton';
import { BudgetDashboardEmptyState } from './components/budget-dashboard-empty-state';
import { BudgetDashboardErrorState } from './components/budget-dashboard-error-state';
import { BudgetDashboardHeader } from './components/budget-dashboard-header';
import { BudgetCockpitWidgetRenderer } from './components/budget-cockpit-widget-renderer';
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

  const [isLineDrawerOpen, setIsLineDrawerOpen] = useState(false);
  const [selectedBudgetLineId, setSelectedBudgetLineId] = useState<string | null>(
    null,
  );
  const [lineDrawerTab, setLineDrawerTab] = useState<BudgetLineDrawerTab>('overview');

  const [isEnvelopeDrawerOpen, setIsEnvelopeDrawerOpen] = useState(false);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);

  const openBudgetLineDrawer = useCallback((lineId: string) => {
    setSelectedBudgetLineId(lineId);
    setLineDrawerTab('overview');
    setIsLineDrawerOpen(true);
  }, []);

  const onLineDrawerOpenChange = useCallback((open: boolean) => {
    setIsLineDrawerOpen(open);
    if (!open) {
      setSelectedBudgetLineId(null);
      setLineDrawerTab('overview');
    }
  }, []);

  const openEnvelopeDrawer = useCallback((envelopeId: string) => {
    setSelectedEnvelopeId(envelopeId);
    setIsEnvelopeDrawerOpen(true);
  }, []);

  const onEnvelopeDrawerOpenChange = useCallback((open: boolean) => {
    setIsEnvelopeDrawerOpen(open);
    if (!open) {
      setSelectedEnvelopeId(null);
    }
  }, []);

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
                    {getCurrencySymbol(data.budget.currency)}
                  </dd>
                </div>
              </dl>
            </CockpitSurfaceCard>

            <BudgetCockpitWidgetRenderer
              data={data}
              taxDisplayMode={taxDisplayMode}
              defaultTaxRate={defaultTaxRate}
              onViewCriticalLines={scrollToCritical}
              criticalRef={criticalRef}
              onEnvelopeClick={openEnvelopeDrawer}
              onBudgetLineClick={openBudgetLineDrawer}
            />

            <BudgetEnvelopeIntelligenceDrawer
              open={isEnvelopeDrawerOpen}
              onOpenChange={onEnvelopeDrawerOpenChange}
              envelopeId={selectedEnvelopeId}
              onBudgetLineClick={openBudgetLineDrawer}
            />

            <BudgetLineIntelligenceDrawer
              open={isLineDrawerOpen}
              onOpenChange={onLineDrawerOpenChange}
              budgetId={data.budget.id}
              budgetName={data.budget.name}
              envelopeName={null}
              envelopeCode={null}
              envelopeType={null}
              budgetLineId={selectedBudgetLineId}
              activeTab={lineDrawerTab}
              onActiveTabChange={setLineDrawerTab}
            />
          </BudgetDashboardShell>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
