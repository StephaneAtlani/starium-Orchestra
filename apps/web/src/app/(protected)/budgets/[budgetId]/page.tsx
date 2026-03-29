'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetKpiCards } from '@/features/budgets/components/budget-kpi-cards';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';
import { BudgetExplorerToolbar } from '@/features/budgets/components/budget-explorer-toolbar';
import { BudgetExplorerTable } from '@/features/budgets/components/budget-explorer-table';
import { BudgetViewTabs } from '@/features/budgets/components/budget-view-tabs';
import { BudgetDensityToggle } from '@/features/budgets/components/budget-density-toggle';
import { BudgetScenarioSelect } from '@/features/budgets/components/budget-scenario-select';
import { LoadingState } from '@/components/feedback/loading-state';
import { useBudgetExplorer } from '@/features/budgets/hooks/use-budget-explorer';
import { useBudgetExplorerTree } from '@/features/budgets/hooks/use-budget-explorer-tree';
import { useBudgetSummary } from '@/features/budgets/hooks/use-budget-summary';
import { useBudgetExerciseSummary } from '@/features/budgets/hooks/use-budget-exercises';
import { useBudgetLinesPlanningQueries } from '@/features/budgets/hooks/use-budget-lines-planning-queries';
import { useUpdateBudgetLinePlanningManualForBudgetMutation } from '@/features/budgets/hooks/use-budget-line-planning';
import { usePermissions } from '@/hooks/use-permissions';
import {
  budgetLines,
  budgetReporting,
  budgetSnapshots,
  budgetVersions,
  budgetReallocations,
  budgetEdit,
  budgetEnvelopeNew,
} from '@/features/budgets/constants/budget-routes';
import { NewBudgetLineDialog } from '@/features/budgets/components/new-budget-line-dialog';
import { PermissionGate } from '@/components/PermissionGate';
import { BudgetStatusBadge } from '@/features/budgets/components/budget-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  explorerSortPresetToState,
  type BudgetExplorerFilters,
  type ExplorerSortPreset,
} from '@/features/budgets/types/budget-explorer.types';
import { BudgetLineIntelligenceDrawer, type BudgetLineDrawerTab } from '@/features/budgets/components/budget-line-drawer/budget-line-intelligence-drawer';
import type { BudgetEnvelope, BudgetLine } from '@/features/budgets/types/budget-management.types';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import { formatTaxAwareAmount } from '@/lib/format-tax-aware-amount';
import { useActiveClient } from '@/hooks/use-active-client';
import { saveBudgetCockpitSelection } from '@/features/budgets/lib/budget-cockpit-selection-storage';
import {
  collectEnvelopeIdsWithFilteredChildren,
  hasActiveBudgetExplorerFilters,
} from '@/features/budgets/lib/filter-budget-tree';
import {
  BUDGET_PILOTAGE_PAGE_SIZE,
  flattenExplorerBudgetLineIds,
} from '@/features/budgets/lib/budget-explorer-flat-lines';
import { getBudgetMonthColumnLabelsFromExerciseStartIso } from '@/features/budgets/lib/budget-month-labels';
import {
  amounts12FromPlanningMonths,
  buildManualPlanningPutPayload,
  replaceMonthAmount,
  type Amounts12,
} from '@/features/budgets/lib/budget-planning-grid';
import type { BudgetPilotageDensity, BudgetPilotageMode } from '@/features/budgets/types/budget-pilotage.types';

export default function BudgetDetailPage() {
  const p = useParams();
  const budgetId = typeof p.budgetId === 'string' ? p.budgetId : null;

  const { budget, envelopes, lines, isLoading, error } = useBudgetExplorer(budgetId);

  const { taxDisplayMode, setTaxDisplayMode, isLoading: isTaxLoading } =
    useTaxDisplayMode();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBudgetLineId, setSelectedBudgetLineId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BudgetLineDrawerTab>('overview');
  const [newLineDialogOpen, setNewLineDialogOpen] = useState(false);

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

  const [pilotageMode, setPilotageMode] = useState<BudgetPilotageMode>('synthese');
  const [pilotageDensity, setPilotageDensity] = useState<BudgetPilotageDensity>('mensuel');
  const [pilotagePage, setPilotagePage] = useState(0);
  const [draftAmounts12ByLineId, setDraftAmounts12ByLineId] = useState<
    Record<string, Amounts12 | undefined>
  >({});

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const prevFiltersActiveRef = useRef(false);
  const hasInitializedExpanded = useRef(false);

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

  const { data: summary } = useBudgetSummary(budgetId);
  const { activeClient } = useActiveClient();
  const { data: exercise, isLoading: exerciseLoading } = useBudgetExerciseSummary(
    budget?.exerciseId ?? null,
  );
  const { has, isLoading: permLoading } = usePermissions();

  const monthColumnLabels = useMemo(() => {
    if (!exercise?.startDate) return [] as string[];
    try {
      return getBudgetMonthColumnLabelsFromExerciseStartIso(exercise.startDate);
    } catch {
      return [] as string[];
    }
  }, [exercise?.startDate]);

  const flatLineIds = useMemo(
    () => flattenExplorerBudgetLineIds(filteredTree),
    [filteredTree],
  );

  const needsPlanningPagination = flatLineIds.length > BUDGET_PILOTAGE_PAGE_SIZE;
  const planningPageCount = Math.max(
    1,
    Math.ceil(flatLineIds.length / BUDGET_PILOTAGE_PAGE_SIZE) || 1,
  );

  const planningFetchedLineIds = useMemo(() => {
    if (!needsPlanningPagination) {
      return flatLineIds;
    }
    const start = pilotagePage * BUDGET_PILOTAGE_PAGE_SIZE;
    return flatLineIds.slice(start, start + BUDGET_PILOTAGE_PAGE_SIZE);
  }, [flatLineIds, needsPlanningPagination, pilotagePage]);

  useEffect(() => {
    if (pilotagePage >= planningPageCount) {
      setPilotagePage(Math.max(0, planningPageCount - 1));
    }
  }, [pilotagePage, planningPageCount]);

  useEffect(() => {
    setPilotagePage(0);
  }, [filters, flatLineIds.length]);

  const planningQueriesEnabled =
    pilotageMode !== 'synthese' &&
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

  const canEditPlanning =
    !permLoading &&
    has('budgets.update') &&
    pilotageMode === 'previsionnel' &&
    pilotageDensity === 'mensuel';

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

  if (isLoading) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <BudgetPageHeader title="Budget" description="Chargement…" />
          <LoadingState rows={3} />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  if (error || !budget) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <BudgetPageHeader title="Budget" />
          <BudgetEmptyState title="Aucun budget à afficher" description="" />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  const kpi = summary?.kpi;
  const currency = budget.currency;
  const isBudgetTtcProjection = taxDisplayMode === 'TTC' && budget.taxMode !== taxDisplayMode;
  const kpiItems = kpi
    ? [
        {
          label: 'Initial',
          value: formatTaxAwareAmount({
            htValue: kpi.totalInitialAmount,
            ttcValue: kpi.totalInitialAmountTtc ?? null,
            currency,
            mode: taxDisplayMode,
            isApproximation: isBudgetTtcProjection,
          }),
        },
        {
          label: 'Révisé',
          value: formatTaxAwareAmount({
            htValue: kpi.totalRevisedAmount,
            ttcValue: kpi.totalRevisedAmountTtc ?? null,
            currency,
            mode: taxDisplayMode,
            isApproximation: isBudgetTtcProjection,
          }),
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
      ]
    : [];

  const isEmptyGlobal = tree.length === 0;
  const isEmptyFiltered = filteredTree.length === 0 && tree.length > 0;

  const selectedLine = (lines ?? []).find((l: BudgetLine) => l.id === selectedBudgetLineId) ?? null;
  const selectedEnvelope =
    selectedLine && envelopes
      ? (envelopes as BudgetEnvelope[]).find((e) => e.id === selectedLine.envelopeId) ?? null
      : null;
  const envelopeName = selectedEnvelope?.name ?? null;
  const envelopeCode = selectedEnvelope?.code ?? null;
  const envelopeType = selectedEnvelope?.type ?? null;

  const pilotageReady =
    pilotageMode === 'synthese' || (monthColumnLabels.length === 12 && !exerciseLoading);

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title={budget.name}
          description={
            budget.code ? `${budget.code} · ${budget.currency}` : budget.currency
          }
          actions={
            <div className="flex items-center gap-2">
              <PermissionGate permission="budgets.update">
                <Link
                  href={budgetEdit(budgetId!)}
                  className="inline-flex h-7 items-center justify-center rounded-md border border-input bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                >
                  Modifier
                </Link>
              </PermissionGate>
              <PermissionGate permission="budgets.create">
                <>
                  <Button
                    type="button"
                    className="h-7 px-2.5 text-[0.8rem] font-medium"
                    onClick={() => setNewLineDialogOpen(true)}
                  >
                    Nouvelle ligne
                  </Button>
                  <Link
                    href={budgetEnvelopeNew(budgetId!)}
                    className="inline-flex h-7 items-center justify-center rounded-md bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Nouvelle enveloppe
                  </Link>
                </>
              </PermissionGate>
            </div>
          }
        />

        <div className="mb-4">
          <BudgetStatusBadge status={budget.status} />
        </div>

        {kpiItems.length > 0 && (
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
          <Card className="mb-6">
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
                  {pilotageMode === 'forecast' && <BudgetScenarioSelect />}
                </div>
                {pilotageMode === 'previsionnel' && pilotageDensity === 'condense' && (
                  <Alert>
                    <AlertDescription>
                      Mode condensé en lecture seule — passez en <strong>mensuel</strong> pour
                      éditer (12 mois envoyés au serveur à chaque enregistrement).
                    </AlertDescription>
                  </Alert>
                )}
                {pilotageMode !== 'synthese' && needsPlanningPagination && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Lignes {flatLineIds.length} — chargement planning par tranche (
                      {BUDGET_PILOTAGE_PAGE_SIZE} max).
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pilotagePage <= 0}
                        onClick={() => setPilotagePage((p) => Math.max(0, p - 1))}
                      >
                        Précédent
                      </Button>
                      <span className="tabular-nums">
                        Page {pilotagePage + 1} / {planningPageCount}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pilotagePage >= planningPageCount - 1}
                        onClick={() =>
                          setPilotagePage((p) => Math.min(planningPageCount - 1, p + 1))
                        }
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
                <BudgetExplorerToolbar
                  filters={filters}
                  setFilters={setFilters}
                  taxDisplayMode={taxDisplayMode}
                  setTaxDisplayMode={setTaxDisplayMode}
                  isTaxLoading={isTaxLoading}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!pilotageReady ? (
                <div className="p-6">
                  <LoadingState rows={2} />
                </div>
              ) : (
                <BudgetExplorerTable
                  nodes={filteredTree}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  onBudgetLineClick={onBudgetLineClick}
                  emptyMessage="Aucune enveloppe."
                  emptyFilteredMessage="Aucun résultat pour ces filtres."
                  isFilteredEmpty={isEmptyFiltered}
                  pilotage={{
                    mode: pilotageMode,
                    density:
                      pilotageMode === 'previsionnel' ? pilotageDensity : 'condense',
                    monthColumnLabels:
                      monthColumnLabels.length === 12
                        ? monthColumnLabels
                        : Array.from({ length: 12 }, () => ''),
                    planningByLineId,
                    planningQueriesLoading: planningQueriesLoading,
                    planningFetchedLineIds,
                    needsPagination: needsPlanningPagination,
                    amounts12ByLineId,
                    draftAmounts12ByLineId,
                    mutatingLineId,
                    canEditPlanning,
                    onMonthCommit,
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accès rapides</CardTitle>
            <CardDescription>Sous-domaines du budget.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href={budgetLines(budgetId!)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Lignes
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href={budgetReporting(budgetId!)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Reporting
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href={budgetSnapshots(budgetId!)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Snapshots
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href={budgetVersions(budgetId!)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Versions
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href={budgetReallocations(budgetId!)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Réallocations
            </Link>
          </CardContent>
        </Card>

        <NewBudgetLineDialog
          open={newLineDialogOpen}
          onOpenChange={setNewLineDialogOpen}
          budgetId={budgetId!}
        />

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
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
