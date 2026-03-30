'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowDownRight,
  PiggyBank,
  RefreshCw,
  Scale,
  TrendingDown,
  Wallet,
  Waypoints,
  Settings2,
} from 'lucide-react';
import { useBudgetDashboardQuery } from '@/features/budgets/hooks/use-budget-dashboard';
import { useBudgetExerciseOptionsQuery } from '@/features/budgets/hooks/use-budget-exercise-options-query';
import { useBudgetsQuery } from '@/features/budgets/hooks/use-budgets-query';
import type { BudgetExerciseSummary } from '@/features/budgets/types/budget-list.types';
import type { BudgetSummary } from '@/features/budgets/types/budget-list.types';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetCockpitResponse } from '@/features/budgets/types/budget-dashboard.types';
import {
  getCockpitAlertsSummary,
  getCockpitKpiData,
} from '@/features/budgets/types/budget-dashboard.types';
import {
  formatForecastGapParts,
  formatKpiAmountParts,
  kpiDisplayAmountNumeric,
} from '@/features/budgets/lib/budget-dashboard-format';
import {
  budgetDashboard,
  budgetDashboardForBudget,
} from '@/features/budgets/constants/budget-routes';
import {
  BudgetKpiCard,
  type BudgetKpiAmountTone,
} from '@/features/budgets/dashboard/components/budget-kpi-card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDashboardWidgets } from '../hooks/use-dashboard-widgets';
import {
  DASHBOARD_BUDGET_KPI_OPTIONS,
  DASHBOARD_BUDGET_SCOPE_AUTO,
  exerciseScopePrefix,
  scopeToSelectValue,
  selectValueToScope,
  totalBudgetAlerts,
  type DashboardBudgetKpiKey,
  type DashboardBudgetWidgetScope,
  type DashboardWidgetsConfig,
} from '../types/dashboard-widgets.types';

function formatDashboardDataAge(updatedAtMs: number): string {
  const diffSec = Math.round((Date.now() - updatedAtMs) / 1000);
  if (diffSec < 8) return 'à l’instant';
  if (diffSec < 60) return `il y a ${diffSec} s`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

function KpiSkeleton() {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border p-4 shadow-sm',
        'ring-1 ring-primary/15 bg-gradient-to-br from-primary/[0.06] via-card to-card',
      )}
    >
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
    </div>
  );
}

function BudgetKpiCardsByKeys({
  data,
  taxDisplayMode,
  defaultTaxRate,
  keys,
  animateKpiNumbers,
}: {
  data: BudgetCockpitResponse;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
  keys: DashboardBudgetKpiKey[];
  animateKpiNumbers: boolean;
}) {
  const kpiPayload = getCockpitKpiData(data);
  if (!kpiPayload) return null;
  const { kpis } = kpiPayload;
  const { budget } = data;
  const c = budget.currency;
  const fmt = (p: Parameters<typeof formatKpiAmountParts>[0]) =>
    formatKpiAmountParts(p);
  const num = (ht: number, ttcFromApi?: number | null) =>
    kpiDisplayAmountNumeric({
      ht,
      ttcFromApi: ttcFromApi ?? undefined,
      mode: taxDisplayMode,
      defaultTaxRate,
    });

  const ecartForecast = kpis.forecast - kpis.totalBudget;
  const ecartTtcFromApi =
    kpis.forecastTtc != null && kpis.totalBudgetTtc != null
      ? kpis.forecastTtc - kpis.totalBudgetTtc
      : undefined;
  const gapParts = formatForecastGapParts(
    {
      totalBudget: kpis.totalBudget,
      forecast: kpis.forecast,
      totalBudgetTtc: kpis.totalBudgetTtc,
      forecastTtc: kpis.forecastTtc,
    },
    c,
    taxDisplayMode,
    defaultTaxRate,
  );
  const ecartSub =
    ecartForecast >= 0
      ? 'Le forecast dépasse le budget révisé sur cette base.'
      : 'Le forecast reste sous le plafond budgétaire révisé.';

  const remainingTone: BudgetKpiAmountTone =
    kpis.remaining < 0 ? 'danger' : kpis.remaining > 0 ? 'success' : 'default';

  const gapTone: BudgetKpiAmountTone =
    ecartForecast > 0 ? 'warning' : ecartForecast < 0 ? 'success' : 'default';

  const cards: Record<DashboardBudgetKpiKey, React.ReactNode> = {
    revised: (
      <BudgetKpiCard
        variant="primary"
        label="Budget révisé"
        description="Plafond de référence"
        parts={fmt({
          ht: kpis.totalBudget,
          ttcFromApi: kpis.totalBudgetTtc,
          currency: c,
          mode: taxDisplayMode,
          defaultTaxRate,
        })}
        amountDisplayValue={num(kpis.totalBudget, kpis.totalBudgetTtc)}
        animateAmount={animateKpiNumbers}
        icon={Wallet}
        dataTestId="dashboard-kpi-total-budget"
      />
    ),
    committed: (
      <BudgetKpiCard
        variant="committed"
        label="Engagé"
        description="Commandes & engagements"
        parts={fmt({
          ht: kpis.committed,
          ttcFromApi: kpis.committedTtc,
          currency: c,
          mode: taxDisplayMode,
          defaultTaxRate,
        })}
        amountDisplayValue={num(kpis.committed, kpis.committedTtc)}
        animateAmount={animateKpiNumbers}
        icon={Waypoints}
        dataTestId="dashboard-kpi-committed"
      />
    ),
    consumed: (
      <BudgetKpiCard
        variant="consumed"
        label="Consommé"
        description="Réalisé (facturé / imputé)"
        parts={fmt({
          ht: kpis.consumed,
          ttcFromApi: kpis.consumedTtc,
          currency: c,
          mode: taxDisplayMode,
          defaultTaxRate,
        })}
        amountDisplayValue={num(kpis.consumed, kpis.consumedTtc)}
        animateAmount={animateKpiNumbers}
        icon={ArrowDownRight}
        dataTestId="dashboard-kpi-consumed"
      />
    ),
    remaining: (
      <BudgetKpiCard
        variant="liquidity"
        label="Disponible"
        description="Reste à engager / consommer"
        parts={fmt({
          ht: kpis.remaining,
          ttcFromApi: kpis.remainingTtc,
          currency: c,
          mode: taxDisplayMode,
          defaultTaxRate,
        })}
        amountDisplayValue={num(kpis.remaining, kpis.remainingTtc)}
        animateAmount={animateKpiNumbers}
        icon={PiggyBank}
        amountTone={remainingTone}
        dataTestId="dashboard-kpi-remaining"
      />
    ),
    forecast: (
      <BudgetKpiCard
        variant="forecast"
        label="Forecast"
        description="Projection à date"
        parts={fmt({
          ht: kpis.forecast,
          ttcFromApi: kpis.forecastTtc,
          currency: c,
          mode: taxDisplayMode,
          defaultTaxRate,
        })}
        amountDisplayValue={num(kpis.forecast, kpis.forecastTtc)}
        animateAmount={animateKpiNumbers}
        icon={Scale}
        dataTestId="dashboard-kpi-forecast"
      />
    ),
    forecastGap: (
      <BudgetKpiCard
        variant="variance"
        label="Écart forecast"
        description="Forecast − budget révisé"
        parts={gapParts}
        subtext={ecartSub}
        amountDisplayValue={num(ecartForecast, ecartTtcFromApi)}
        animateAmount={animateKpiNumbers}
        icon={TrendingDown}
        amountTone={gapTone}
        dataTestId="dashboard-kpi-forecast-gap"
      />
    ),
  };

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      data-testid="dashboard-budget-kpis"
    >
      {keys.map((k) => (
        <React.Fragment key={k}>{cards[k]}</React.Fragment>
      ))}
    </div>
  );
}

function scopeSelectLabel(
  scope: DashboardBudgetWidgetScope | undefined,
  exercises: BudgetExerciseSummary[],
  budgets: BudgetSummary[],
): string {
  const v = scopeToSelectValue(scope);
  if (v === DASHBOARD_BUDGET_SCOPE_AUTO) return 'Automatique (recommandé)';
  if (v.startsWith(exerciseScopePrefix)) {
    const exId = v.slice(exerciseScopePrefix.length);
    const ex = exercises.find((e) => e.id === exId);
    if (ex) {
      return `${ex.code ? `${ex.code} — ` : ''}${ex.name} — budget actif`;
    }
    return 'Exercice (budget actif)';
  }
  const b = budgets.find((x) => x.id === v);
  if (b) {
    return `${b.code ? `${b.code} — ` : ''}${b.name}${b.exerciseName ? ` · ${b.exerciseName}` : ''}`;
  }
  return 'Périmètre';
}

function BudgetWidgetSettingsDialog({
  open,
  onOpenChange,
  config,
  setBudgetKpisVisible,
  toggleBudgetKpi,
  resetBudgetKpisDefaults,
  setBudgetScope,
  resetBudgetScope,
  setBudgetKpiAnimateNumbers,
  exercises,
  budgets,
  listsLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DashboardWidgetsConfig;
  setBudgetKpisVisible: (visible: boolean) => void;
  toggleBudgetKpi: (key: DashboardBudgetKpiKey, checked: boolean) => void;
  resetBudgetKpisDefaults: () => void;
  setBudgetScope: (scope: DashboardBudgetWidgetScope | undefined) => void;
  resetBudgetScope: () => void;
  setBudgetKpiAnimateNumbers: (animate: boolean) => void;
  exercises: BudgetExerciseSummary[];
  budgets: BudgetSummary[];
  listsLoading: boolean;
}) {
  const selected = new Set(config.budgetKpis.kpis);
  const scopeValue = scopeToSelectValue(config.budgetKpis.scope);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Widget Budget</DialogTitle>
          <DialogDescription>
            Périmètre budgétaire, indicateurs et affichage — enregistrés pour ce
            client et votre compte.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={config.budgetKpis.visible}
              onChange={(e) => setBudgetKpisVisible(e.target.checked)}
            />
            <span className="text-sm font-medium">Afficher le widget sur le dashboard</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={config.budgetKpis.animateKpiNumbers !== false}
              onChange={(e) => setBudgetKpiAnimateNumbers(e.target.checked)}
            />
            <span className="text-sm font-medium">Animer les montants (compteur)</span>
          </label>

          <div className="space-y-2 border-t border-border pt-3">
            <Label htmlFor="dashboard-widget-budget-scope">Budget affiché</Label>
            <Select
              value={scopeValue}
              disabled={listsLoading}
              onValueChange={(v) =>
                setBudgetScope(selectValueToScope(v ?? DASHBOARD_BUDGET_SCOPE_AUTO))
              }
            >
              <SelectTrigger
                id="dashboard-widget-budget-scope"
                size="sm"
                className="w-full max-w-full min-w-0"
                data-testid="dashboard-widget-budget-scope"
              >
                <SelectValue placeholder="Périmètre">
                  {scopeSelectLabel(config.budgetKpis.scope, exercises, budgets)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DASHBOARD_BUDGET_SCOPE_AUTO}>
                  Automatique (recommandé)
                </SelectItem>
                {exercises.map((ex) => (
                  <SelectItem
                    key={`${exerciseScopePrefix}${ex.id}`}
                    value={`${exerciseScopePrefix}${ex.id}`}
                  >
                    {ex.code ? `${ex.code} — ` : ''}
                    {ex.name} — budget actif
                  </SelectItem>
                ))}
                {budgets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.code ? `${b.code} — ` : ''}
                    {b.name}
                    {b.exerciseName ? ` · ${b.exerciseName}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              « Automatique » suit la résolution par défaut du serveur. Sinon,
              choisissez un exercice (budget actif) ou un budget précis.
            </p>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              Indicateurs affichés (au moins un)
            </p>
            <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {DASHBOARD_BUDGET_KPI_OPTIONS.map((opt) => (
                <li key={opt.id}>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={selected.has(opt.id)}
                      disabled={
                        selected.has(opt.id) && config.budgetKpis.kpis.length <= 1
                      }
                      onChange={(e) => toggleBudgetKpi(opt.id, e.target.checked)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 border-t-0 sm:flex-row sm:flex-wrap sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => resetBudgetKpisDefaults()}
            >
              Réinitialiser les KPI
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => resetBudgetScope()}
            >
              Réinitialiser le périmètre
            </Button>
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Widget synthèse budget configurable (localStorage par utilisateur + client).
 */
export function DashboardBudgetKpiWidget() {
  const {
    taxDisplayMode,
    defaultTaxRate,
    isLoading: taxLoading,
  } = useTaxDisplayMode();

  const {
    config,
    hydrated,
    setBudgetKpisVisible,
    toggleBudgetKpi,
    resetBudgetKpisDefaults,
    setBudgetScope,
    resetBudgetScope,
    setBudgetKpiAnimateNumbers,
  } = useDashboardWidgets();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const { data: exerciseOptions = [], isLoading: exercisesLoading } =
    useBudgetExerciseOptionsQuery();
  /** Liste paginée lourde : uniquement pour le sélecteur « Personnaliser », pas pour le chargement du dashboard. */
  const { data: budgetsList, isLoading: budgetsLoading } = useBudgetsQuery(
    {
      page: 1,
      limit: 200,
      status: 'ALL',
    },
    { enabled: settingsOpen },
  );
  const budgets = budgetsList?.items ?? [];
  const exercisesReady = !exercisesLoading;
  const listsLoading =
    exercisesLoading || (settingsOpen && budgetsLoading);
  const hasScopedTarget = Boolean(
    config.budgetKpis.scope?.budgetId || config.budgetKpis.scope?.exerciseId,
  );
  /** Résolution cockpit : il suffit de la liste exercices (pas d’attendre la liste budgets). */
  const emptyNoExerciseContext =
    exercisesReady && !hasScopedTarget && exerciseOptions.length === 0;

  const dashboardParams = React.useMemo(
    () => ({
      includeEnvelopes: false,
      includeLines: false,
      ...(() => {
        const s = config.budgetKpis.scope;
        if (!s) return {};
        if (s.budgetId) return { budgetId: s.budgetId };
        if (s.exerciseId) return { exerciseId: s.exerciseId };
        return {};
      })(),
    }),
    [config.budgetKpis.scope],
  );

  const query = useBudgetDashboardQuery(dashboardParams, {
    /** Tant que les exercices ne sont pas connus, on lance en parallèle ; sans exercice (sans scope), pas d’appel cockpit inutile. */
    enabled: !exercisesReady || !emptyNoExerciseContext || hasScopedTarget,
  });

  const data = query.data;
  const dataUpdatedAt = query.dataUpdatedAt;
  const refetchDashboard = query.refetch;
  const isRefetching = query.isFetching && !query.isLoading;
  const err = query.error instanceof Error ? query.error.message : null;
  /** Message immédiat dès que les listes confirment l’absence d’exercice, sans attendre le 404 du cockpit. */
  const errMsg =
    err ??
    (emptyNoExerciseContext && !data ? 'Aucun budget ou exercice trouvé' : null);
  const showKpiSkeleton =
    query.isLoading && !data && !emptyNoExerciseContext;

  const alertCount = data ? totalBudgetAlerts(getCockpitAlertsSummary(data)) : 0;

  if (!hydrated) {
    return (
      <section className="space-y-4" aria-hidden>
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
      </section>
    );
  }

  if (!config.budgetKpis.visible) {
    return (
      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Le widget <span className="font-medium text-foreground">Budget</span>{' '}
            est masqué.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setBudgetKpisVisible(true)}
            >
              Afficher le widget
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="mr-1 size-4" />
              Personnaliser
            </Button>
          </div>
        </div>
        <BudgetWidgetSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          config={config}
          setBudgetKpisVisible={setBudgetKpisVisible}
          toggleBudgetKpi={toggleBudgetKpi}
          resetBudgetKpisDefaults={resetBudgetKpisDefaults}
          setBudgetScope={setBudgetScope}
          resetBudgetScope={resetBudgetScope}
          setBudgetKpiAnimateNumbers={setBudgetKpiAnimateNumbers}
          exercises={exerciseOptions}
          budgets={budgets}
          listsLoading={listsLoading}
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Budget
          </h2>
          {data ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{data.budget.name}</span>
                {alertCount > 0 ? (
                  <Badge
                    variant="outline"
                    className="border-destructive/25 bg-destructive/10 text-destructive"
                  >
                    {alertCount} alerte{alertCount > 1 ? 's' : ''}
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="font-normal text-muted-foreground"
                  >
                    0 alerte
                  </Badge>
                )}
              </span>
              <span className="text-muted-foreground">
                · {data.exercise.name}
                {data.exercise.code ? ` (${data.exercise.code})` : null}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Synthèse du budget actif pour ce client.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {data && dataUpdatedAt > 0 ? (
            <span
              className="text-xs text-muted-foreground tabular-nums"
              title={new Date(dataUpdatedAt).toLocaleString('fr-FR')}
            >
              Mis à jour {formatDashboardDataAge(dataUpdatedAt)}
            </span>
          ) : null}
          {taxLoading ? (
            <span className="text-xs text-muted-foreground">TVA…</span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="inline-flex whitespace-nowrap gap-2"
            disabled={query.isFetching}
            onClick={() => void refetchDashboard()}
            aria-label="Actualiser les indicateurs budget"
          >
            <RefreshCw
              className={cn('size-4 shrink-0', isRefetching && 'animate-spin')}
            />
            Actualiser
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setSettingsOpen(true)}
            aria-label="Personnaliser le widget budget"
          >
            <Settings2 className="size-4" />
            Personnaliser
          </Button>
          <Link
            href={
              data
                ? budgetDashboardForBudget(data.exercise.id, data.budget.id)
                : budgetDashboard()
            }
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'whitespace-nowrap',
            )}
          >
            Dashboard budget
          </Link>
        </div>
      </div>

      <BudgetWidgetSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
        setBudgetKpisVisible={setBudgetKpisVisible}
        toggleBudgetKpi={toggleBudgetKpi}
        resetBudgetKpisDefaults={resetBudgetKpisDefaults}
        setBudgetScope={setBudgetScope}
        resetBudgetScope={resetBudgetScope}
        setBudgetKpiAnimateNumbers={setBudgetKpiAnimateNumbers}
        exercises={exerciseOptions}
        budgets={budgets}
        listsLoading={listsLoading}
      />

      {showKpiSkeleton ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: Math.max(1, config.budgetKpis.kpis.length) }).map(
            (_, i) => (
              <KpiSkeleton key={i} />
            ),
          )}
        </div>
      ) : errMsg ? (
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{errMsg}</p>
          <p className="mt-1">
            Accédez aux budgets depuis le menu Finance ou créez un exercice / budget.
          </p>
          <Link
            href={budgetDashboard()}
            className={cn(
              buttonVariants({ variant: 'link' }),
              'mt-2 h-auto p-0',
            )}
          >
            Ouvrir le dashboard budget
          </Link>
        </div>
      ) : data ? (
        <BudgetKpiCardsByKeys
          data={data}
          taxDisplayMode={taxDisplayMode}
          defaultTaxRate={defaultTaxRate}
          keys={config.budgetKpis.kpis}
          animateKpiNumbers={config.budgetKpis.animateKpiNumbers !== false}
        />
      ) : null}
    </section>
  );
}
