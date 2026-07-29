'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BarChart3,
  Bookmark,
  BriefcaseBusiness,
  ChevronLeft,
  Layers,
  Pencil,
  Plus,
  Upload,
} from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { useWorkspaceBreadcrumbOverride } from '@/components/shell/workspace-breadcrumb-context';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetKpiCards } from '@/features/budgets/components/budget-kpi-cards';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';
import { BudgetExplorerToolbar } from '@/features/budgets/components/budget-explorer-toolbar';
import { BudgetExplorerTable } from '@/features/budgets/components/budget-explorer-table';
import { BudgetViewTabs } from '@/features/budgets/components/budget-view-tabs';
import { BudgetDetailDashboard } from '@/features/budgets/components/budget-detail-dashboard';
import { BudgetDensityToggle } from '@/features/budgets/components/budget-density-toggle';
import { LoadingState } from '@/components/feedback/loading-state';
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
import {
  budgetEdit,
  budgetImport,
  budgetList,
  budgetDetail,
} from '@/features/budgets/constants/budget-routes';
import { CreateBudgetSnapshotDialog } from '@/features/budgets/components/create-budget-snapshot-dialog';
import { CreateBudgetReallocationDialog } from '@/features/budgets/components/create-budget-reallocation-dialog';
import { PermissionGate } from '@/components/PermissionGate';
import { BudgetStatusBadge } from '@/features/budgets/components/budget-status-badge';
import { ResourceAclTriggerButton } from '@/features/resource-acl/components/resource-acl-trigger-button';
import { AccessExplainerPopover } from '@/features/access-diagnostics/components/access-explainer-popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  explorerSortPresetToState,
  type BudgetExplorerFilters,
  type ExplorerSortPreset,
} from '@/features/budgets/types/budget-explorer.types';
import { BudgetLineIntelligenceDrawer, type BudgetLineDrawerTab } from '@/features/budgets/components/budget-line-drawer/budget-line-intelligence-drawer';
import type { BudgetEnvelope, BudgetLine } from '@/features/budgets/types/budget-management.types';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import { formatTaxAwareAmount } from '@/lib/format-tax-aware-amount';
import {
  budgetKpiAmountForTaxMode,
  formatSignedDeltaPercent,
} from '@/features/budgets/lib/budget-formatters';
import { useActiveClient } from '@/hooks/use-active-client';
import { saveBudgetCockpitSelection } from '@/features/budgets/lib/budget-cockpit-selection-storage';
import {
  collectAllEnvelopeIds,
  collectEnvelopeIdsWithFilteredChildren,
  hasActiveBudgetExplorerFilters,
} from '@/features/budgets/lib/filter-budget-tree';
import { flattenExplorerBudgetLineIds } from '@/features/budgets/lib/budget-explorer-flat-lines';
import { getBudgetMonthColumnLabelsSafe } from '@/features/budgets/lib/budget-month-labels';
import {
  amounts12FromPlanningMonths,
  buildManualPlanningPutPayload,
  replaceMonthAmount,
  type Amounts12,
} from '@/features/budgets/lib/budget-planning-grid';
import type { BudgetPilotageDensity, BudgetPilotageMode } from '@/features/budgets/types/budget-pilotage.types';
import { useBudgetForecast } from '@/features/budgets/forecast/hooks/use-budget-forecast';
import { ForecastKpiCards } from '@/features/budgets/forecast/components/forecast-kpi-cards';
import { BudgetDecisionTimeline } from '@/features/budgets/components/budget-decision-timeline';
import { BudgetReportingForecastPage } from '@/features/budgets/forecast/budget-reporting-forecast-page';
import { useExerciseBudgetsReportingQuery } from '@/features/budgets/hooks/use-exercise-budgets-reporting-query';
import { useBudgetDashboardQuery } from '@/features/budgets/hooks/use-budget-dashboard';
import { CreateFinancialEventDialog } from '@/features/budgets/components/budget-line-drawer/create-financial-event-dialog';
import { CreateInvoiceDialog } from '@/features/budgets/components/budget-line-drawer/create-invoice-dialog';
import {
  BudgetExpenseEntryModal,
  BudgetPrevisionnelModal,
  BudgetReallocationsJournalModal,
  BudgetScenariosVersionsModal,
  BudgetSourcesImportsModal,
  type BudgetDetailModal,
  type BudgetExpenseLaunchKind,
} from '@/features/budgets/components/budget-detail-modals';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function BudgetDetailPage() {
  const p = useParams();
  const router = useRouter();
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

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBudgetLineId, setSelectedBudgetLineId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BudgetLineDrawerTab>('overview');
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [openModal, setOpenModal] = useState<BudgetDetailModal>(null);
  const [reallocationCreateOpen, setReallocationCreateOpen] = useState(false);
  /** Ligne dont la calculette planning est ouverte (prévisionnel). */
  const [planningCalculatorLineId, setPlanningCalculatorLineId] = useState<string | null>(null);
  const [expenseDialogState, setExpenseDialogState] = useState<{
    kind: BudgetExpenseLaunchKind;
    lineId: string;
  } | null>(null);

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

  const expenseDialogLine = useMemo(
    () => (lines ?? []).find((line: BudgetLine) => line.id === expenseDialogState?.lineId) ?? null,
    [lines, expenseDialogState?.lineId],
  );

  const selectedEnvelope = useMemo(
    () =>
      selectedLine && envelopes
        ? (envelopes as BudgetEnvelope[]).find((e) => e.id === selectedLine.envelopeId) ?? null
        : null,
    [selectedLine, envelopes],
  );

  const envelopeName = selectedEnvelope?.name ?? null;
  const envelopeCode = selectedEnvelope?.code ?? null;
  const envelopeType = selectedEnvelope?.type ?? null;

  const [pilotageMode, setPilotageMode] = useState<BudgetPilotageMode>('dashboard');
  const [pilotageDensity, setPilotageDensity] = useState<BudgetPilotageDensity>('mensuel');
  const [draftAmounts12ByLineId, setDraftAmounts12ByLineId] = useState<
    Record<string, Amounts12 | undefined>
  >({});

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const prevFiltersActiveRef = useRef(false);
  const hasInitializedExpanded = useRef(false);
  const pilotageCardRef = useRef<HTMLDivElement | null>(null);

  const onBudgetLineClick = useCallback((lineId: string) => {
    setSelectedBudgetLineId(lineId);
    setIsDrawerOpen(true);
    setActiveTab('overview');
  }, []);

  const onDrawerOpenChange = useCallback((nextOpen: boolean) => {
    setIsDrawerOpen(nextOpen);
    if (!nextOpen) {
      setSelectedBudgetLineId(null);
      setActiveTab('overview');
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

  const scrollToPilotageCard = useCallback(() => {
    requestAnimationFrame(() => {
      pilotageCardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, []);

  const openPilotageMode = useCallback(
    (mode: BudgetPilotageMode) => {
      setPilotageMode(mode);
      scrollToPilotageCard();
    },
    [scrollToPilotageCard],
  );

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
  const canCreateBudgetResources = !permLoading && has('budgets.create');

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

  const exerciseStatusLabel = useMemo(() => {
    switch (exercise?.status) {
      case 'ACTIVE':
        return 'Actif';
      case 'CLOSED':
        return 'Cloture';
      case 'ARCHIVED':
        return 'Archive';
      case 'DRAFT':
        return 'Brouillon';
      default:
        return null;
    }
  }, [exercise?.status]);

  const budgetSelectLabel = useMemo(() => {
    if (!budget) return '';
    return budget.code ? `${budget.name} (${budget.code})` : budget.name;
  }, [budget]);

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

  const planningQueriesEnabled =
    (pilotageMode === 'previsionnel' ||
      pilotageMode === 'atterrissage' ||
      openModal === 'forecast') &&
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

  const canEditPrevisionnel =
    !permLoading &&
    has('budgets.update') &&
    (pilotageMode === 'previsionnel' || openModal === 'forecast');
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

  const isEmptyGlobalForForecastHook = tree.length === 0;
  const forecastQuery = useBudgetForecast(budgetId, {
    enabled:
      !!budgetId &&
      !!budget &&
      !isEmptyGlobalForForecastHook &&
      pilotageMode === 'forecast',
  });
  const dashboardQuery = useBudgetDashboardQuery(
    {
      exerciseId: budget?.exerciseId,
      budgetId: budget?.id,
      includeEnvelopes: true,
      includeLines: true,
    },
    {
      enabled: !!budget?.id && !!budget?.exerciseId && pilotageMode === 'dashboard',
    },
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

  if (isLoading) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <header className="mb-6 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Budget</h1>
            <p className="text-sm text-muted-foreground">Chargement…</p>
          </header>
          <LoadingState rows={3} />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  if (error || !budget) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Budget</h1>
          </header>
          <BudgetEmptyState title="Aucun budget à afficher" description="" />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  const kpi = budgetSummaryKpi;
  const currency = budget.currency;
  const isBudgetTtcProjection = taxDisplayMode === 'TTC' && budget.taxMode !== taxDisplayMode;
  const kpiItems = kpi
    ? (() => {
        const forecastN = budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'forecast');
        const budgetN = budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'initial');
        const pVsBudget = formatSignedDeltaPercent(forecastN, budgetN);
        const previSub = pVsBudget != null ? `vs budget ${pVsBudget}` : '';

        return [
          {
            label: 'Budget',
            value: formatTaxAwareAmount({
              htValue: kpi.totalInitialAmount,
              ttcValue: kpi.totalInitialAmountTtc ?? null,
              currency,
              mode: taxDisplayMode,
              isApproximation: isBudgetTtcProjection,
            }),
          },
          {
            label: 'Total planifié',
            value: formatTaxAwareAmount({
              htValue: kpi.totalForecastAmount,
              ttcValue: kpi.totalForecastAmountTtc ?? null,
              currency,
              mode: taxDisplayMode,
              isApproximation: isBudgetTtcProjection,
            }),
            ...(previSub ? { subtext: previSub } : {}),
          },
          {
            label: 'Engagé',
            value: formatTaxAwareAmount({
              htValue: kpi.totalCommittedAmount,
              ttcValue: kpi.totalCommittedAmountTtc ?? null,
              currency,
              mode: taxDisplayMode,
              isApproximation: isBudgetTtcProjection,
            }),
          },
          {
            label: 'Consommé',
            value: formatTaxAwareAmount({
              htValue: kpi.totalConsumedAmount,
              ttcValue: kpi.totalConsumedAmountTtc ?? null,
              currency,
              mode: taxDisplayMode,
              isApproximation: isBudgetTtcProjection,
            }),
          },
          {
            label: 'Restant',
            value: formatTaxAwareAmount({
              htValue: kpi.totalRemainingAmount,
              ttcValue: kpi.totalRemainingAmountTtc ?? null,
              currency,
              mode: taxDisplayMode,
              isApproximation: isBudgetTtcProjection,
            }),
          },
        ];
      })()
    : [];

  const isEmptyGlobal = tree.length === 0;
  const isEmptyFiltered = filteredTree.length === 0 && tree.length > 0;

  const pilotageReady =
    pilotageMode === 'dashboard' ||
    pilotageMode === 'synthese' ||
    pilotageMode === 'forecast' ||
    pilotageMode === 'comparaison' ||
    pilotageMode === 'decisions' ||
    (monthColumnLabels.length === 12 && !exerciseLoading);

  return (
    <RequireActiveClient>
      <PageContainer>
        <header className="space-y-3">
          <div className="flex items-center gap-2">
            <Link
              href={budgetList()}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Retour a la liste des budgets"
            >
              <ChevronLeft className="size-4" aria-hidden />
              Tous les budgets
            </Link>
          </div>
          <div className="rounded-[var(--radius-xl)] border border-border/70 bg-card p-4 shadow-[var(--shadow-1)] sm:p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]">
                    <BriefcaseBusiness className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                        {budget.name}
                      </h1>
                      <BudgetStatusBadge status={budget.status} className="shrink-0" />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        {budget.ownerOrgUnitSummary?.name ?? 'Budget sans rattachement d organisation'}
                      </span>
                      {exerciseYearLabel ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>exercice {exerciseYearLabel}</span>
                        </>
                      ) : null}
                      <span aria-hidden>·</span>
                      <span>{budget.currency}</span>
                      {budget.ownerUserName ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>Resp. {budget.ownerUserName}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AccessExplainerPopover
                    resourceType="BUDGET"
                    resourceId={budget.id}
                    resourceLabel={budget.name}
                    intent="READ"
                    iconOnly
                  />
                  <ResourceAclTriggerButton
                    resourceType="BUDGET"
                    resourceId={budget.id}
                    resourceLabel={budget.name}
                    size="sm"
                    label="Acces"
                  />
                  <PermissionGate permission="budgets.update">
                    <Link
                      href={budgetEdit(budget.id)}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'icon' }),
                        'size-10 shrink-0',
                      )}
                      aria-label={`Modifier le budget ${budget.name}`}
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </PermissionGate>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="min-w-0">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Budget
                  </label>
                  <Select
                    value={budget.id}
                    onValueChange={(nextBudgetId) => {
                      if (nextBudgetId && nextBudgetId !== budget.id) {
                        router.push(budgetDetail(nextBudgetId));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un budget">
                        {budgetSelectLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(exerciseBudgetsQuery.data?.items ?? []).map((item) => (
                        <SelectItem key={item.budget.id} value={item.budget.id}>
                          {item.budget.name}
                          {item.budget.code ? ` (${item.budget.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <PermissionGate permission="budgets.read">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() => setOpenModal('sources')}
                    >
                      <Upload className="size-4" aria-hidden />
                      Sources
                    </Button>
                  </PermissionGate>
                  <PermissionGate permission="budgets.read">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() => setOpenModal('forecast')}
                    >
                      <BarChart3 className="size-4" aria-hidden />
                      Previsionnel
                    </Button>
                  </PermissionGate>
                  <PermissionGate permission="budgets.read">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() => setOpenModal('reallocations')}
                    >
                      <Layers className="size-4" aria-hidden />
                      Reaffectations
                    </Button>
                  </PermissionGate>
                  <PermissionGate permission="budgets.read">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() => setOpenModal('scenarios')}
                    >
                      <Bookmark className="size-4" aria-hidden />
                      Scenarios
                    </Button>
                  </PermissionGate>
                  {canCreateBudgetResources ? (
                    <PermissionGate permission="budgets.create">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="min-h-11"
                        onClick={() => setOpenModal('expense')}
                      >
                        <Plus className="size-4" aria-hidden />
                        Saisir une depense
                      </Button>
                    </PermissionGate>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {exerciseYearLabel ? (
                  <span className="starium-tab-btn starium-tab-btn--active inline-flex min-h-11 items-center">
                    {exerciseYearLabel}
                  </span>
                ) : null}
                {exerciseStatusLabel ? (
                  <span className="starium-tab-btn inline-flex min-h-11 items-center">
                    {exerciseStatusLabel}
                  </span>
                ) : null}
                <span className="starium-tab-btn inline-flex min-h-11 items-center">
                  {budget.taxMode}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* KPI compacts : uniquement si pas encore de structure (pas de doublon avec l’onglet Dashboard + tableau). */}
        {kpiItems.length > 0 && isEmptyGlobal && (
          <BudgetKpiCards items={kpiItems} className="mb-6" />
        )}

        {isEmptyGlobal && (
          <BudgetEmptyState
            title="Aucune enveloppe"
            description="Ce budget n’a pas encore d’enveloppe. Les lignes budgétaires apparaîtront ici une fois la structure créée."
            className="mb-6"
          />
        )}

        {!isEmptyGlobal && (
          <Card ref={pilotageCardRef} className="mb-6">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex flex-col gap-4">
                <BudgetViewTabs mode={pilotageMode} onModeChange={setPilotageMode} />
                <div className="flex flex-wrap items-center gap-3">
                  {pilotageMode === 'previsionnel' && (
                    <BudgetDensityToggle
                      density={pilotageDensity}
                      onDensityChange={setPilotageDensity}
                    />
                  )}
                </div>
                {pilotageMode === 'previsionnel' && pilotageDensity === 'condense' && (
                  <Alert>
                    <AlertDescription>
                      Mode condensé en lecture seule — passez en <strong>mensuel</strong> pour
                      éditer (12 mois envoyés au serveur à chaque enregistrement).
                    </AlertDescription>
                  </Alert>
                )}
                {pilotageMode !== 'decisions' && pilotageMode !== 'comparaison' ? (
                  <BudgetExplorerToolbar
                    filters={filters}
                    setFilters={setFilters}
                    taxDisplayMode={taxDisplayMode}
                    setTaxDisplayMode={setTaxDisplayMode}
                    isTaxLoading={isTaxLoading}
                  />
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!pilotageReady ? (
                <div className="p-6">
                  <LoadingState rows={2} />
                </div>
              ) : pilotageMode === 'forecast' ? (
                <div className="space-y-4 p-4 sm:p-6">
                  <ForecastKpiCards
                    data={forecastQuery.data}
                    isLoading={forecastQuery.isLoading}
                    error={forecastQuery.error as Error | null}
                  />
                  <p className="text-sm text-muted-foreground">
                    Comparaison détaillée (baseline, versions figées) : onglet{' '}
                    <strong>Comparaison</strong> ci-dessus.
                  </p>
                </div>
              ) : pilotageMode === 'comparaison' ? (
                <div className="p-4 sm:p-6">
                  <BudgetReportingForecastPage budgetId={budgetId!} variant="embedded" />
                </div>
              ) : pilotageMode === 'decisions' ? (
                <BudgetDecisionTimeline budgetId={budgetId!} />
              ) : pilotageMode === 'dashboard' ? (
                summaryError || dashboardQuery.isError ? (
                  <div className="p-6">
                    <Alert variant="destructive">
                      <AlertTitle>Résumé budgétaire indisponible</AlertTitle>
                      <AlertDescription>
                        Impossible de charger les indicateurs de pilotage pour ce budget.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (summaryLoading && !budgetSummaryKpi) ||
                  (dashboardQuery.isLoading && !dashboardQuery.data) ? (
                  <div className="p-6">
                    <LoadingState rows={2} />
                  </div>
                ) : budgetSummaryKpi ? (
                  <div className="p-4 sm:p-6">
                    <BudgetDetailDashboard
                      kpi={budgetSummaryKpi}
                      dashboard={dashboardQuery.data}
                      currency={currency}
                      taxDisplayMode={taxDisplayMode}
                      defaultTaxRate={budget.defaultTaxRate ?? defaultTaxRate}
                      envelopes={(envelopes as BudgetEnvelope[]) ?? []}
                      lines={(lines as BudgetLine[]) ?? []}
                      onBudgetLineClick={onBudgetLineClick}
                    />
                  </div>
                ) : (
                  <div className="p-6 text-sm text-muted-foreground">
                    Aucune donnée de synthèse pour ce budget.
                  </div>
                )
              ) : (
                <BudgetExplorerTable
                  nodes={filteredTree}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  onExpandAllEnvelopes={onExpandAllEnvelopes}
                  onCollapseAllEnvelopes={onCollapseAllEnvelopes}
                  onBudgetLineClick={onBudgetLineClick}
                  emptyMessage="Aucune enveloppe."
                  emptyFilteredMessage="Aucun résultat pour ces filtres."
                  isFilteredEmpty={isEmptyFiltered}
                  pilotage={{
                    mode: pilotageMode,
                    density:
                      pilotageMode === 'previsionnel' ? pilotageDensity : 'condense',
                    monthColumnLabels,
                    planningByLineId,
                    planningQueriesLoading: planningQueriesLoading,
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
                  }}
                />
              )}
            </CardContent>
          </Card>
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
          budgetId={budgetId!}
          open={snapshotDialogOpen}
          onOpenChange={setSnapshotDialogOpen}
        />

        <BudgetSourcesImportsModal
          open={openModal === 'sources'}
          onOpenChange={(nextOpen) => setOpenModal(nextOpen ? 'sources' : null)}
          budgetName={budget.name}
          onNewImport={() => router.push(budgetImport(budget.id))}
        />

        <BudgetPrevisionnelModal
          open={openModal === 'forecast'}
          onOpenChange={(nextOpen) => setOpenModal(nextOpen ? 'forecast' : null)}
          budgetName={budget.name}
          exerciseYearLabel={exerciseYearLabel}
          currency={currency}
          taxDisplayMode={taxDisplayMode}
          isTaxLoading={isTaxLoading}
          setTaxDisplayMode={setTaxDisplayMode}
          isBudgetTtcProjection={isBudgetTtcProjection}
          kpi={budgetSummaryKpi}
          filters={filters}
          setFilters={setFilters}
          density={pilotageDensity}
          onDensityChange={setPilotageDensity}
          exercisePeriodHint={exercisePeriodHint}
          envelopes={(envelopes as BudgetEnvelope[]) ?? []}
          lines={(lines as BudgetLine[]) ?? []}
          amounts12ByLineId={amounts12ByLineId}
          canEditPlanning={canEditPlanning}
          applyPendingLineId={mutatingLineId}
          onApplyCalculator={(lineId, padded) => {
            setDraftAmounts12ByLineId((prev) => ({ ...prev, [lineId]: padded }));
            planningMutation.mutate(
              { lineId, payload: buildManualPlanningPutPayload(padded) },
              {
                onSuccess: () => {
                  setDraftAmounts12ByLineId((prev) => {
                    const next = { ...prev };
                    delete next[lineId];
                    return next;
                  });
                },
              },
            );
          }}
          nodes={filteredTree}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          onExpandAllEnvelopes={onExpandAllEnvelopes}
          onCollapseAllEnvelopes={onCollapseAllEnvelopes}
          onBudgetLineClick={onBudgetLineClick}
          isFilteredEmpty={isEmptyFiltered}
          pilotage={{
            mode: 'previsionnel',
            density: pilotageDensity,
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
          }}
        />

        <BudgetScenariosVersionsModal
          open={openModal === 'scenarios'}
          onOpenChange={(nextOpen) => setOpenModal(nextOpen ? 'scenarios' : null)}
          budgetId={budgetId!}
          budgetName={budget.name}
          exerciseYearLabel={exerciseYearLabel}
          currency={currency}
          kpi={budgetSummaryKpi}
          lines={(lines as BudgetLine[]) ?? []}
          onOpenDetailedComparison={() => openPilotageMode('comparaison')}
        />

        <BudgetExpenseEntryModal
          open={openModal === 'expense'}
          onOpenChange={(nextOpen) => setOpenModal(nextOpen ? 'expense' : null)}
          envelopes={(envelopes as BudgetEnvelope[]) ?? []}
          lines={(lines as BudgetLine[]) ?? []}
          onLaunch={({ lineId, kind }) => {
            setOpenModal(null);
            setExpenseDialogState({ lineId, kind });
          }}
        />

        <BudgetReallocationsJournalModal
          open={openModal === 'reallocations'}
          onOpenChange={(nextOpen) => setOpenModal(nextOpen ? 'reallocations' : null)}
          budgetId={budgetId!}
          budgetName={budget.name}
          lines={(lines as BudgetLine[]) ?? []}
          onCreateRequest={() => {
            setOpenModal(null);
            setReallocationCreateOpen(true);
          }}
        />

        <CreateBudgetReallocationDialog
          budgetId={budgetId!}
          lines={(lines as BudgetLine[]) ?? []}
          open={reallocationCreateOpen}
          onOpenChange={setReallocationCreateOpen}
        />

        {expenseDialogLine && expenseDialogState?.kind === 'INVOICE' ? (
          <CreateInvoiceDialog
            open
            onOpenChange={(nextOpen) => {
              if (!nextOpen) setExpenseDialogState(null);
            }}
            budgetId={budgetId!}
            line={expenseDialogLine}
          />
        ) : null}

        {expenseDialogLine &&
        (expenseDialogState?.kind === 'COMMITMENT_REGISTERED' ||
          expenseDialogState?.kind === 'CONSUMPTION_REGISTERED') ? (
          <CreateFinancialEventDialog
            open
            onOpenChange={(nextOpen) => {
              if (!nextOpen) setExpenseDialogState(null);
            }}
            budgetId={budgetId!}
            line={expenseDialogLine}
            initialEventType={expenseDialogState.kind}
          />
        ) : null}

        <BudgetLineIntelligenceDrawer
          open={isDrawerOpen}
          onOpenChange={onDrawerOpenChange}
          budgetId={budgetId!}
          budgetName={budget.name}
          envelopeName={envelopeName}
          envelopeCode={envelopeCode}
          envelopeType={envelopeType}
          budgetLineId={selectedBudgetLineId}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          lineDrilldownNavigation={lineDrilldownNavigation}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
