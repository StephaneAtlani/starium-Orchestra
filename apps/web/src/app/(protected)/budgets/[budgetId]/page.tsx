'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { useWorkspaceBreadcrumbOverride } from '@/components/shell/workspace-breadcrumb-context';
import { PageContainer } from '@/components/layout/page-container';
import { LoadingState } from '@/components/feedback/loading-state';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';
import {
  BudgetDetailHeader,
  BudgetDetailKpiStrip,
  BudgetDetailWorkspace,
} from '@/features/budgets/components/budget-detail';
import { useBudgetExplorer } from '@/features/budgets/hooks/use-budget-explorer';
import { useBudgetExplorerTree } from '@/features/budgets/hooks/use-budget-explorer-tree';
import { useBudgetSummary } from '@/features/budgets/hooks/use-budget-summary';
import { useBudgetExerciseSummary } from '@/features/budgets/hooks/use-budget-exercises';
import { useBudgetLinesPlanningQueries } from '@/features/budgets/hooks/use-budget-lines-planning-queries';
import { useUpdateBudgetLinePlanningManualForBudgetMutation } from '@/features/budgets/hooks/use-budget-line-planning';
import { useBudgetPlanningQuickCalculator } from '@/features/budgets/hooks/use-budget-planning-quick-calculator';
import { BudgetPlanningQuickCalculatorDialog } from '@/features/budgets/components/budget-planning-quick-calculator-dialog';
import { useInlineUpdateBudgetLineForBudgetMutation } from '@/features/budgets/hooks/use-inline-update-budget-line';
import { usePermissions } from '@/hooks/use-permissions';
import { budgetDetail } from '@/features/budgets/constants/budget-routes';
import { CreateBudgetSnapshotDialog } from '@/features/budgets/components/create-budget-snapshot-dialog';
import { CreateBudgetReallocationDialog } from '@/features/budgets/components/create-budget-reallocation-dialog';
import {
  explorerSortPresetToState,
  type BudgetExplorerFilters,
  type ExplorerSortPreset,
} from '@/features/budgets/types/budget-explorer.types';
import {
  BudgetLineIntelligenceDrawer,
  type BudgetLineDrawerTab,
} from '@/features/budgets/components/budget-line-drawer/budget-line-intelligence-drawer';
import type {
  BudgetEnvelope,
  BudgetLine,
} from '@/features/budgets/types/budget-management.types';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import { useActiveClient } from '@/hooks/use-active-client';
import { saveBudgetCockpitSelection } from '@/features/budgets/lib/budget-cockpit-selection-storage';
import {
  collectAllEnvelopeIds,
  collectEnvelopeIdsWithFilteredChildren,
  hasActiveBudgetExplorerFilters,
} from '@/features/budgets/lib/filter-budget-tree';
import { flattenExplorerBudgetLineIds } from '@/features/budgets/lib/budget-explorer-flat-lines';
import { getBudgetMonthColumnLabelsSafe } from '@/features/budgets/lib/budget-month-labels';
import { downloadBudgetDetailCsv } from '@/features/budgets/lib/budget-detail-export';
import {
  amounts12FromPlanningMonths,
  buildManualPlanningPutPayload,
  replaceMonthAmount,
  type Amounts12,
} from '@/features/budgets/lib/budget-planning-grid';
import type { BudgetPilotageDensity } from '@/features/budgets/types/budget-pilotage.types';
import {
  budgetDetailTabToExplorerMode,
  isBudgetDetailTabId,
  DEFAULT_BUDGET_DETAIL_TAB,
  type BudgetDetailTabId,
  type BudgetSuiviView,
} from '@/features/budgets/types/budget-detail-tabs.types';
import { useExerciseBudgetsReportingQuery } from '@/features/budgets/hooks/use-exercise-budgets-reporting-query';
import { useBudgetDashboardQuery } from '@/features/budgets/hooks/use-budget-dashboard';
import {
  BudgetExpenseEntryModal,
  type BudgetDetailModal,
} from '@/features/budgets/components/budget-detail-modals';

const TAB_QUERY_PARAM = 'onglet';

export default function BudgetDetailPage() {
  const p = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const budgetId = typeof p.budgetId === 'string' ? p.budgetId : null;

  const { budget, envelopes, lines, isLoading, error } = useBudgetExplorer(budgetId);

  useWorkspaceBreadcrumbOverride(
    budget?.name && budgetId
      ? { entityLabel: budget.name, entityHref: budgetDetail(budgetId) }
      : null,
  );

  const {
    taxDisplayMode,
    setTaxDisplayMode,
    isLoading: isTaxLoading,
    defaultTaxRate,
  } = useTaxDisplayMode();

  /** Onglet actif persisté en query string : les liens profonds vers un onglet restent partageables. */
  const tabParam = searchParams.get(TAB_QUERY_PARAM);
  const tab: BudgetDetailTabId = isBudgetDetailTabId(tabParam)
    ? tabParam
    : DEFAULT_BUDGET_DETAIL_TAB;

  const onTabChange = useCallback(
    (nextTab: BudgetDetailTabId) => {
      const next = new URLSearchParams(searchParams.toString());
      if (nextTab === DEFAULT_BUDGET_DETAIL_TAB) next.delete(TAB_QUERY_PARAM);
      else next.set(TAB_QUERY_PARAM, nextTab);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [suiviView, setSuiviView] = useState<BudgetSuiviView>('synthese');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBudgetLineId, setSelectedBudgetLineId] = useState<string | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<BudgetLineDrawerTab>('overview');
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [openModal, setOpenModal] = useState<BudgetDetailModal>(null);
  const [reallocationCreateOpen, setReallocationCreateOpen] = useState(false);
  /** Ligne dont la calculette planning est ouverte (prévisionnel). */
  const [planningCalculatorLineId, setPlanningCalculatorLineId] = useState<string | null>(
    null,
  );

  const [filters, setFilters] = useState<BudgetExplorerFilters>({});
  const [sortPreset, setSortPreset] = useState<ExplorerSortPreset>('default');
  const explorerSort = useMemo(() => explorerSortPresetToState(sortPreset), [sortPreset]);
  const { tree, filteredTree } = useBudgetExplorerTree(
    budget,
    envelopes,
    lines,
    filters,
    explorerSort,
  );

  const selectedLine = useMemo(
    () => (lines ?? []).find((l: BudgetLine) => l.id === selectedBudgetLineId) ?? null,
    [lines, selectedBudgetLineId],
  );

  const selectedEnvelope = useMemo(
    () =>
      selectedLine && envelopes
        ? (envelopes as BudgetEnvelope[]).find((e) => e.id === selectedLine.envelopeId) ??
          null
        : null,
    [selectedLine, envelopes],
  );

  const [pilotageDensity, setPilotageDensity] = useState<BudgetPilotageDensity>('mensuel');
  const [draftAmounts12ByLineId, setDraftAmounts12ByLineId] = useState<
    Record<string, Amounts12 | undefined>
  >({});

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const prevFiltersActiveRef = useRef(false);
  const hasInitializedExpanded = useRef(false);

  const onBudgetLineClick = useCallback((lineId: string) => {
    setSelectedBudgetLineId(lineId);
    setIsDrawerOpen(true);
    setActiveDrawerTab('overview');
  }, []);

  const onDrawerOpenChange = useCallback((nextOpen: boolean) => {
    setIsDrawerOpen(nextOpen);
    if (!nextOpen) {
      setSelectedBudgetLineId(null);
      setActiveDrawerTab('overview');
    }
  }, []);

  const onToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const {
    data: budgetSummaryKpi,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useBudgetSummary(budgetId);
  const { activeClient } = useActiveClient();
  const { data: exercise, isLoading: exerciseLoading } = useBudgetExerciseSummary(
    budget?.exerciseId ?? null,
  );
  const exerciseBudgetsQuery = useExerciseBudgetsReportingQuery(
    budget?.exerciseId ?? null,
    { limit: 100, offset: 0 },
    { enabled: !!budget?.exerciseId },
  );
  const { has, isLoading: permLoading } = usePermissions();

  const monthColumnLabels = useMemo(
    () => getBudgetMonthColumnLabelsSafe(exercise?.startDate),
    [exercise?.startDate],
  );

  const exercisePeriodHint = useMemo((): string | null => {
    if (!exercise?.startDate || !exercise?.endDate) return null;
    const fmt = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const start = new Date(exercise.startDate);
    const end = new Date(exercise.endDate);
    return `Exercice ${fmt.format(start)} → ${fmt.format(end)} · 12 mois (mois 1 = premier mois d’exercice)`;
  }, [exercise?.startDate, exercise?.endDate]);

  const exerciseYearLabel = useMemo(() => {
    if (!exercise?.startDate) return null;
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(exercise.startDate));
  }, [exercise?.startDate]);

  const budgetOptions = useMemo(
    () =>
      (exerciseBudgetsQuery.data?.items ?? []).map((item) => ({
        id: item.budget.id,
        name: item.budget.name,
        code: item.budget.code ?? null,
      })),
    [exerciseBudgetsQuery.data?.items],
  );

  const planningQuickCalc = useBudgetPlanningQuickCalculator({ monthColumnLabels });

  const flatLineIds = useMemo(
    () => flattenExplorerBudgetLineIds(filteredTree),
    [filteredTree],
  );

  const lineDrilldownNavigation = useMemo(() => {
    const lineId = selectedBudgetLineId;
    if (!lineId || flatLineIds.length === 0) return null;
    const idx = flatLineIds.indexOf(lineId);
    if (idx < 0) return null;
    return {
      hasPrev: idx > 0,
      hasNext: idx < flatLineIds.length - 1,
      onPrevLine: () => setSelectedBudgetLineId(flatLineIds[idx - 1]!),
      onNextLine: () => setSelectedBudgetLineId(flatLineIds[idx + 1]!),
    };
  }, [selectedBudgetLineId, flatLineIds]);

  /** Toutes les lignes visibles : pas de pagination côté planning (requêtes parallèles par ligne). */
  const planningFetchedLineIds = flatLineIds;

  const explorerMode = budgetDetailTabToExplorerMode(tab, suiviView);

  const planningQueriesEnabled =
    (explorerMode === 'previsionnel' || explorerMode === 'atterrissage') &&
    monthColumnLabels.length === 12 &&
    planningFetchedLineIds.length > 0;

  const { planningByLineId, isLoading: planningQueriesLoading } =
    useBudgetLinesPlanningQueries({
      lineIds: planningFetchedLineIds,
      enabled: planningQueriesEnabled,
    });

  const planningMutation = useUpdateBudgetLinePlanningManualForBudgetMutation(budgetId);
  const mutatingLineId =
    planningMutation.isPending && planningMutation.variables
      ? planningMutation.variables.lineId
      : null;

  const inlineCommentMutation = useInlineUpdateBudgetLineForBudgetMutation(budgetId, {
    silentSuccess: true,
  });
  const savingCommentLineId =
    inlineCommentMutation.isPending && inlineCommentMutation.variables
      ? inlineCommentMutation.variables.lineId
      : null;

  const amounts12ByLineId = useMemo(() => {
    const m = new Map<string, Amounts12 | null>();
    for (const id of planningFetchedLineIds) {
      const d = draftAmounts12ByLineId[id];
      if (d) {
        m.set(id, d);
        continue;
      }
      const pl = planningByLineId.get(id);
      m.set(id, pl ? amounts12FromPlanningMonths(pl.months) : null);
    }
    return m;
  }, [planningFetchedLineIds, draftAmounts12ByLineId, planningByLineId]);

  const { reset: resetPlanningQuickCalc } = planningQuickCalc;
  useEffect(() => {
    if (!planningCalculatorLineId) return;
    const amounts = amounts12ByLineId.get(planningCalculatorLineId);
    resetPlanningQuickCalc(amounts ?? null);
  }, [planningCalculatorLineId, amounts12ByLineId, resetPlanningQuickCalc]);

  const canEditPrevisionnel = !permLoading && has('budgets.update') && tab === 'previsionnel';
  const canEditPlanning = canEditPrevisionnel && pilotageDensity === 'mensuel';

  const onOpenPlanningCalculator = useCallback((lineId: string) => {
    setPlanningCalculatorLineId(lineId);
  }, []);

  const onPlanningCalculatorOpenChange = useCallback((open: boolean) => {
    if (!open) setPlanningCalculatorLineId(null);
  }, []);

  const onLineCommentCommit = useCallback(
    (lineId: string, description: string) => {
      inlineCommentMutation.mutate({ lineId, payload: { description } });
    },
    [inlineCommentMutation],
  );

  const onMonthCommit = useCallback(
    (lineId: string, monthIndex0: number, amount: number) => {
      const p = planningByLineId.get(lineId);
      const base =
        draftAmounts12ByLineId[lineId] ??
        (p ? amounts12FromPlanningMonths(p.months) : null);
      if (!base) {
        return;
      }
      const next = replaceMonthAmount(base, monthIndex0, amount);
      setDraftAmounts12ByLineId((prev) => ({ ...prev, [lineId]: next }));
      planningMutation.mutate(
        { lineId, payload: buildManualPlanningPutPayload(next) },
        {
          onSuccess: () => {
            setDraftAmounts12ByLineId((prev) => {
              const n = { ...prev };
              delete n[lineId];
              return n;
            });
          },
        },
      );
    },
    [draftAmounts12ByLineId, planningByLineId, planningMutation],
  );

  useEffect(() => {
    if (!activeClient?.id || !budget?.id || !budget.exerciseId) return;
    saveBudgetCockpitSelection(activeClient.id, {
      exerciseId: budget.exerciseId,
      budgetId: budget.id,
    });
  }, [activeClient?.id, budget?.id, budget?.exerciseId]);

  useEffect(() => {
    const active = hasActiveBudgetExplorerFilters(filters);
    if (active) {
      setExpandedIds(collectEnvelopeIdsWithFilteredChildren(filteredTree));
    } else if (prevFiltersActiveRef.current) {
      setExpandedIds(new Set());
    }
    prevFiltersActiveRef.current = active;
  }, [filters, filteredTree]);

  useEffect(() => {
    if (tree.length > 0 && !hasInitializedExpanded.current) {
      const rootEnvelopeIds = tree
        .filter((n) => n.type === 'envelope')
        .map((n) => n.id);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        for (const id of rootEnvelopeIds) next.add(id);
        return next;
      });
      hasInitializedExpanded.current = true;
    }
  }, [tree]);

  /** Toujours actif : le bandeau d'alertes est visible quel que soit l'onglet. */
  const dashboardQuery = useBudgetDashboardQuery(
    {
      exerciseId: budget?.exerciseId,
      budgetId: budget?.id,
      includeEnvelopes: true,
      includeLines: true,
    },
    { enabled: !!budget?.id && !!budget?.exerciseId },
  );

  const allEnvelopeIds = useMemo(
    () => collectAllEnvelopeIds(filteredTree),
    [filteredTree],
  );

  const onExpandAllEnvelopes = useCallback(() => {
    setExpandedIds(new Set(allEnvelopeIds));
  }, [allEnvelopeIds]);

  const onCollapseAllEnvelopes = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const onExport = useCallback(() => {
    if (!budget) return;
    downloadBudgetDetailCsv({
      budgetName: budget.name,
      envelopes: (envelopes as BudgetEnvelope[]) ?? [],
      lines: (lines as BudgetLine[]) ?? [],
    });
  }, [budget, envelopes, lines]);

  const onReallocate = useCallback(() => {
    onTabChange('reallocations');
    setReallocationCreateOpen(true);
  }, [onTabChange]);

  if (isLoading) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <header className="mb-6 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Budget
            </h1>
            <p className="text-sm text-muted-foreground">Chargement…</p>
          </header>
          <LoadingState rows={3} />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  if (error || !budget || !budgetId) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <header className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Budget
            </h1>
          </header>
          <BudgetEmptyState title="Aucun budget à afficher" description="" />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  const currency = budget.currency;
  const isBudgetTtcProjection = taxDisplayMode === 'TTC' && budget.taxMode !== taxDisplayMode;
  const isEmptyGlobal = tree.length === 0;
  const isEmptyFiltered = filteredTree.length === 0 && tree.length > 0;
  const explorerReady =
    explorerMode !== 'previsionnel' && explorerMode !== 'atterrissage'
      ? true
      : monthColumnLabels.length === 12 && !exerciseLoading;

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetDetailHeader
          budget={budget}
          exerciseYearLabel={exerciseYearLabel}
          budgetOptions={budgetOptions}
          activeTab={tab}
          onBudgetChange={(nextBudgetId) => router.push(budgetDetail(nextBudgetId))}
          onExport={onExport}
          onCreateSnapshot={() => setSnapshotDialogOpen(true)}
          onNavigateTab={onTabChange}
          onReallocate={onReallocate}
          onRegisterExpense={() => setOpenModal('expense')}
        />

        <BudgetDetailKpiStrip
          kpi={budgetSummaryKpi}
          currency={currency}
          taxDisplayMode={taxDisplayMode}
          setTaxDisplayMode={setTaxDisplayMode}
          isTaxLoading={isTaxLoading}
          isTtcProjection={isBudgetTtcProjection}
          isLoading={summaryLoading}
          isError={summaryError}
          expenseTypeFilter={filters.expenseType ?? null}
          onExpenseTypeFilterChange={(expenseType) =>
            setFilters((current) => ({
              ...current,
              expenseType: expenseType ?? undefined,
            }))
          }
        />

        {isEmptyGlobal ? (
          <BudgetEmptyState
            title="Aucune enveloppe"
            description="Ce budget n’a pas encore d’enveloppe. Les lignes budgétaires apparaîtront ici une fois la structure créée."
          />
        ) : (
          <BudgetDetailWorkspace
            budgetId={budgetId}
            tab={tab}
            onTabChange={onTabChange}
            suiviView={suiviView}
            onSuiviViewChange={setSuiviView}
            currency={currency}
            taxDisplayMode={taxDisplayMode}
            setTaxDisplayMode={setTaxDisplayMode}
            isTaxLoading={isTaxLoading}
            onBudgetLineClick={onBudgetLineClick}
            lines={(lines as BudgetLine[]) ?? []}
            onCreateSnapshot={() => setSnapshotDialogOpen(true)}
            onCreateReallocation={() => setReallocationCreateOpen(true)}
            explorer={{
              isReady: explorerReady,
              filters,
              setFilters,
              density: pilotageDensity,
              onDensityChange: setPilotageDensity,
              nodes: filteredTree,
              expandedIds,
              onToggleExpand,
              onExpandAllEnvelopes,
              onCollapseAllEnvelopes,
              isFilteredEmpty: isEmptyFiltered,
              pilotage: {
                mode: explorerMode ?? 'synthese',
                density: tab === 'previsionnel' ? pilotageDensity : 'condense',
                monthColumnLabels,
                planningByLineId,
                planningQueriesLoading,
                planningFetchedLineIds,
                amounts12ByLineId,
                draftAmounts12ByLineId,
                mutatingLineId,
                canEditPlanning,
                canEditPrevisionnelMeta: canEditPrevisionnel,
                onMonthCommit,
                onOpenPlanningCalculator,
                onLineCommentCommit,
                savingCommentLineId,
                sortPreset,
                onSortPresetChange: setSortPreset,
                currency: budget.currency,
                budgetTaxMode: budget.taxMode,
                taxDisplayMode,
              },
            }}
            overview={{
              kpi: budgetSummaryKpi,
              dashboard: dashboardQuery.data,
              defaultTaxRate: budget.defaultTaxRate ?? defaultTaxRate,
              envelopes: (envelopes as BudgetEnvelope[]) ?? [],
              lines: (lines as BudgetLine[]) ?? [],
              exerciseStartDateIso: exercise?.startDate ?? null,
              exerciseEndDateIso: exercise?.endDate ?? null,
              isLoading: summaryLoading || dashboardQuery.isLoading,
              isError: summaryError || dashboardQuery.isError,
            }}
          />
        )}

        <BudgetPlanningQuickCalculatorDialog
          open={!!planningCalculatorLineId}
          onOpenChange={onPlanningCalculatorOpenChange}
          exercisePeriodHint={exercisePeriodHint}
          calc={planningQuickCalc}
          footer={{
            mode: 'planning',
            applyPending:
              !!planningCalculatorLineId &&
              planningMutation.isPending &&
              planningMutation.variables?.lineId === planningCalculatorLineId,
            onApplyToPlanning: () => {
              if (!planningCalculatorLineId) return;
              if (!planningQuickCalc.hasMonthAttribution) return;
              const padded = Array.from(
                { length: 12 },
                (_, i) => planningQuickCalc.monthValues[i] ?? 0,
              ) as unknown as Amounts12;
              const lineId = planningCalculatorLineId;
              planningMutation.mutate(
                { lineId, payload: buildManualPlanningPutPayload(padded) },
                {
                  onSuccess: () => {
                    onPlanningCalculatorOpenChange(false);
                    setDraftAmounts12ByLineId((prev) => {
                      const n = { ...prev };
                      delete n[lineId];
                      return n;
                    });
                  },
                },
              );
            },
          }}
        />

        <CreateBudgetSnapshotDialog
          budgetId={budgetId}
          open={snapshotDialogOpen}
          onOpenChange={setSnapshotDialogOpen}
        />

        <BudgetExpenseEntryModal
          open={openModal === 'expense'}
          onOpenChange={(nextOpen) => setOpenModal(nextOpen ? 'expense' : null)}
          budgetId={budgetId}
          budgetName={budget.name}
          envelopes={(envelopes as BudgetEnvelope[]) ?? []}
          lines={(lines as BudgetLine[]) ?? []}
        />

        <CreateBudgetReallocationDialog
          budgetId={budgetId}
          lines={(lines as BudgetLine[]) ?? []}
          open={reallocationCreateOpen}
          onOpenChange={setReallocationCreateOpen}
        />

        <BudgetLineIntelligenceDrawer
          open={isDrawerOpen}
          onOpenChange={onDrawerOpenChange}
          budgetId={budgetId}
          budgetName={budget.name}
          envelopeName={selectedEnvelope?.name ?? null}
          envelopeCode={selectedEnvelope?.code ?? null}
          envelopeType={selectedEnvelope?.type ?? null}
          budgetLineId={selectedBudgetLineId}
          activeTab={activeDrawerTab}
          onActiveTabChange={setActiveDrawerTab}
          lineDrilldownNavigation={lineDrilldownNavigation}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
