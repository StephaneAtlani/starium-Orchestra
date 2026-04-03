'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
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
import { usePermissions } from '@/hooks/use-permissions';
import {
  budgetLines,
  budgetReporting,
  budgetSnapshots,
  budgetVersions,
  budgetReallocations,
  budgetEdit,
  budgetEnvelopeNew,
  budgetImport,
} from '@/features/budgets/constants/budget-routes';
import { NewBudgetLineDialog } from '@/features/budgets/components/new-budget-line-dialog';
import { CreateBudgetSnapshotDialog } from '@/features/budgets/components/create-budget-snapshot-dialog';
import { PermissionGate } from '@/components/PermissionGate';
import { BudgetStatusBadge } from '@/features/budgets/components/budget-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { getBudgetMonthColumnLabelsFromExerciseStartIso } from '@/features/budgets/lib/budget-month-labels';
import {
  amounts12FromPlanningMonths,
  buildManualPlanningPutPayload,
  replaceMonthAmount,
  type Amounts12,
} from '@/features/budgets/lib/budget-planning-grid';
import type { BudgetPilotageDensity, BudgetPilotageMode } from '@/features/budgets/types/budget-pilotage.types';
import { useBudgetForecast } from '@/features/budgets/forecast/hooks/use-budget-forecast';
import { ForecastKpiCards } from '@/features/budgets/forecast/components/forecast-kpi-cards';

export default function BudgetDetailPage() {
  const p = useParams();
  const budgetId = typeof p.budgetId === 'string' ? p.budgetId : null;

  const { budget, envelopes, lines, isLoading, error } = useBudgetExplorer(budgetId);

  const {
    taxDisplayMode,
    setTaxDisplayMode,
    isLoading: isTaxLoading,
    defaultTaxRate,
  } = useTaxDisplayMode();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBudgetLineId, setSelectedBudgetLineId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BudgetLineDrawerTab>('overview');
  const [newLineDialogOpen, setNewLineDialogOpen] = useState(false);
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);

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

  const {
    data: budgetSummaryKpi,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useBudgetSummary(budgetId);
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

  /** Toutes les lignes visibles : pas de pagination côté planning (requêtes parallèles par ligne). */
  const planningFetchedLineIds = flatLineIds;

  const planningQueriesEnabled =
    pilotageMode !== 'synthese' &&
    pilotageMode !== 'dashboard' &&
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

  const isEmptyGlobalForForecastHook = tree.length === 0;
  const forecastQuery = useBudgetForecast(budgetId, {
    enabled:
      !!budgetId &&
      !!budget &&
      !isEmptyGlobalForForecastHook &&
      pilotageMode === 'forecast',
  });

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
        const initialN = budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'initial');
        const revisedN = budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'revised');
        const pVsI = formatSignedDeltaPercent(forecastN, initialN);
        const pVsR = formatSignedDeltaPercent(forecastN, revisedN);
        const previSub = [pVsI != null ? `vs initial ${pVsI}` : null, pVsR != null ? `vs révisé ${pVsR}` : null]
          .filter((s): s is string => Boolean(s))
          .join(' · ');

        return [
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

  const selectedLine = (lines ?? []).find((l: BudgetLine) => l.id === selectedBudgetLineId) ?? null;
  const selectedEnvelope =
    selectedLine && envelopes
      ? (envelopes as BudgetEnvelope[]).find((e) => e.id === selectedLine.envelopeId) ?? null
      : null;
  const envelopeName = selectedEnvelope?.name ?? null;
  const envelopeCode = selectedEnvelope?.code ?? null;
  const envelopeType = selectedEnvelope?.type ?? null;

  const pilotageReady =
    pilotageMode === 'dashboard' ||
    pilotageMode === 'synthese' ||
    pilotageMode === 'forecast' ||
    (monthColumnLabels.length === 12 && !exerciseLoading);

  return (
    <RequireActiveClient>
      <PageContainer>
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {budget.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
                {budget.code ? (
                  <span className="font-medium text-foreground">{budget.code}</span>
                ) : null}
                {budget.code ? (
                  <span className="text-muted-foreground" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span className="text-muted-foreground">{budget.currency}</span>
                <span className="text-muted-foreground" aria-hidden>
                  ·
                </span>
                <BudgetStatusBadge status={budget.status} className="shrink-0" />
              </div>
            </div>
            <PermissionGate permission="budgets.update">
              <Link
                href={budgetEdit(budget.id)}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  'size-9 shrink-0 text-muted-foreground hover:text-foreground',
                )}
                aria-label={`Modifier le budget ${budget.name}`}
              >
                <Pencil className="size-4" />
              </Link>
            </PermissionGate>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
            <PermissionGate permission="budgets.read">
              <Link
                href={budgetImport(budget.id)}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
              >
                Importer
              </Link>
            </PermissionGate>
            <PermissionGate permission="budgets.create">
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                onClick={() => setSnapshotDialogOpen(true)}
              >
                <span className="inline sm:hidden">Snapshot</span>
                <span className="hidden sm:inline">Créer un snapshot</span>
              </Button>
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                onClick={() => setNewLineDialogOpen(true)}
              >
                Nouvelle ligne
              </Button>
              <Link
                href={budgetEnvelopeNew(budget.id)}
                className={cn(buttonVariants({ size: 'sm' }), 'shrink-0')}
              >
                Nouvelle enveloppe
              </Link>
            </PermissionGate>
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
                  {pilotageMode === 'forecast' ? (
                    <Link
                      href={budgetReporting(budgetId!)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Reporting et comparaison
                    </Link>
                  ) : null}
                </div>
                {pilotageMode === 'previsionnel' && pilotageDensity === 'condense' && (
                  <Alert>
                    <AlertDescription>
                      Mode condensé en lecture seule — passez en <strong>mensuel</strong> pour
                      éditer (12 mois envoyés au serveur à chaque enregistrement).
                    </AlertDescription>
                  </Alert>
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
              ) : pilotageMode === 'forecast' ? (
                <div className="space-y-4 p-4 sm:p-6">
                  <ForecastKpiCards
                    data={forecastQuery.data}
                    isLoading={forecastQuery.isLoading}
                    error={forecastQuery.error as Error | null}
                  />
                  <p className="text-sm text-muted-foreground">
                    <Link
                      href={budgetReporting(budgetId!)}
                      className="font-medium text-primary hover:underline"
                    >
                      Comparaison détaillée (baseline, snapshot, versions)
                    </Link>
                  </p>
                </div>
              ) : pilotageMode === 'dashboard' ? (
                summaryError ? (
                  <div className="p-6">
                    <Alert variant="destructive">
                      <AlertTitle>Résumé budgétaire indisponible</AlertTitle>
                      <AlertDescription>
                        Impossible de charger les indicateurs agrégés pour ce budget.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : summaryLoading && !budgetSummaryKpi ? (
                  <div className="p-6">
                    <LoadingState rows={2} />
                  </div>
                ) : budgetSummaryKpi ? (
                  <div className="p-4 sm:p-6">
                    <BudgetDetailDashboard
                      kpi={budgetSummaryKpi}
                      currency={currency}
                      taxDisplayMode={taxDisplayMode}
                      defaultTaxRate={budget.defaultTaxRate ?? defaultTaxRate}
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
                    monthColumnLabels:
                      monthColumnLabels.length === 12
                        ? monthColumnLabels
                        : Array.from({ length: 12 }, () => ''),
                    planningByLineId,
                    planningQueriesLoading: planningQueriesLoading,
                    planningFetchedLineIds,
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

        <CreateBudgetSnapshotDialog
          budgetId={budgetId!}
          open={snapshotDialogOpen}
          onOpenChange={setSnapshotDialogOpen}
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
