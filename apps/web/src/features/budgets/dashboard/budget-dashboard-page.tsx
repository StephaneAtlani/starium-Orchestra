'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { BudgetCockpitUserSettingsDialog } from '@/features/budgets/cockpit-settings/budget-cockpit-user-settings-dialog';
import { budgetReporting } from '@/features/budgets/constants/budget-routes';
import { useBudgetExplorer } from '@/features/budgets/hooks/use-budget-explorer';
import { useBudgetExplorerTree } from '@/features/budgets/hooks/use-budget-explorer-tree';
import { explorerSortPresetToState } from '@/features/budgets/types/budget-explorer.types';
import { flattenExplorerBudgetLineIds } from '@/features/budgets/lib/budget-explorer-flat-lines';

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
    useUserOverrides,
    onUserOverridesModeChange,
    animateAmounts,
    onAnimateAmountsChange,
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

  const isAggregatedBudgetMode = budgetId === '__ALL__';
  const forecastReportingHref =
    budgetId && !isAggregatedBudgetMode ? budgetReporting(budgetId) : undefined;

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
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const cockpitNavBudgetId =
    !isAggregatedBudgetMode && data ? data.budget.id : null;

  const {
    budget: cockpitNavBudget,
    envelopes: cockpitNavEnvelopes,
    lines: cockpitNavLines,
  } = useBudgetExplorer(cockpitNavBudgetId);

  const explorerSortDefault = useMemo(() => explorerSortPresetToState('default'), []);

  const { tree: cockpitNavTree } = useBudgetExplorerTree(
    cockpitNavBudget,
    cockpitNavEnvelopes,
    cockpitNavLines,
    {},
    explorerSortDefault,
  );

  const cockpitLineIdsOrder = useMemo(
    () => flattenExplorerBudgetLineIds(cockpitNavTree),
    [cockpitNavTree],
  );

  const cockpitLineDrilldownNavigation = useMemo(() => {
    const lineId = selectedBudgetLineId;
    if (!lineId || cockpitLineIdsOrder.length === 0) return null;
    const idx = cockpitLineIdsOrder.indexOf(lineId);
    if (idx < 0) return null;
    return {
      hasPrev: idx > 0,
      hasNext: idx < cockpitLineIdsOrder.length - 1,
      onPrevLine: () => setSelectedBudgetLineId(cockpitLineIdsOrder[idx - 1]!),
      onNextLine: () => setSelectedBudgetLineId(cockpitLineIdsOrder[idx + 1]!),
    };
  }, [selectedBudgetLineId, cockpitLineIdsOrder]);

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
              useUserOverrides={useUserOverrides}
              onUseUserOverridesModeChange={(next) => {
                onUserOverridesModeChange(next);
                if (!next) setSettingsOpen(false);
              }}
              onCustomize={() => {
                if (!useUserOverrides) onUserOverridesModeChange(true);
                setSettingsOpen(true);
              }}
              forecastReportingHref={forecastReportingHref}
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

            <BudgetCockpitUserSettingsDialog
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              widgets={data.widgets}
              useUserOverrides={useUserOverrides}
              animateAmounts={animateAmounts}
              onAnimateAmountsChange={onAnimateAmountsChange}
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
            />

            <BudgetCockpitWidgetRenderer
              data={data}
              taxDisplayMode={taxDisplayMode}
              defaultTaxRate={defaultTaxRate}
              animateAmounts={animateAmounts}
              onViewCriticalLines={scrollToCritical}
              criticalRef={criticalRef}
              onEnvelopeClick={
                isAggregatedBudgetMode ? () => {} : openEnvelopeDrawer
              }
              onBudgetLineClick={
                isAggregatedBudgetMode ? () => {} : openBudgetLineDrawer
              }
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
              lineDrilldownNavigation={cockpitLineDrilldownNavigation}
            />
          </BudgetDashboardShell>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
