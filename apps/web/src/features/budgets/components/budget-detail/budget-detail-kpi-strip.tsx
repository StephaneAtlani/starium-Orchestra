'use client';

import { useMemo, useState } from 'react';
import {
  PortfolioProgressBar,
  consumptionTone,
  toneAmountClass,
  type StatusTone,
} from '@/components/portfolio';
import { TaxDisplayModeToggle } from '@/components/finance/tax-display-mode-toggle';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { formatTaxAwareAmount, type TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import { budgetKpiAmountForTaxMode, formatPercent } from '@/features/budgets/lib/budget-formatters';
import {
  BUDGET_LABELS,
  BUDGET_LABEL_HINTS,
} from '@/features/budgets/lib/budget-display-labels';
import { aggregateBudgetLinesToSummaryKpi } from '@/features/budgets/lib/aggregate-budget-lines-to-kpi';
import type { BudgetSummaryKpi } from '@/features/budgets/types/budget-reporting.types';
import type { BudgetLine } from '@/features/budgets/types/budget-management.types';

export type BudgetExpenseNatureFilter = 'CAPEX' | 'OPEX' | null;

export interface BudgetDetailKpiStripProps {
  kpi: BudgetSummaryKpi | undefined;
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  setTaxDisplayMode: (mode: TaxDisplayMode) => void;
  isTaxLoading?: boolean;
  /** Le budget est saisi en HT alors que l'affichage demandé est TTC : montants projetés. */
  isTtcProjection: boolean;
  isLoading: boolean;
  isError: boolean;
  /**
   * Lignes du budget — nécessaires pour recalculer les KPI quand CAPEX/OPEX est actif.
   * Sans lignes, le filtre nature ne peut pas réduire les montants.
   */
  lines?: readonly BudgetLine[] | null;
  /** Filtre nature contrôlé (Tout / CAPEX / OPEX). Si omis, état interne. */
  expenseTypeFilter?: BudgetExpenseNatureFilter;
  onExpenseTypeFilterChange?: (value: BudgetExpenseNatureFilter) => void;
}

const EXPENSE_NATURE_FILTERS: { label: string; value: BudgetExpenseNatureFilter }[] = [
  { label: 'Tout', value: null },
  { label: 'CAPEX', value: 'CAPEX' },
  { label: 'OPEX', value: 'OPEX' },
];

type KpiCell = {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: StatusTone;
  /** Progression 0–100 de la barre de pied de cellule. */
  progress: number;
};

function resolveDisplayKpi(
  kpi: BudgetSummaryKpi | undefined,
  lines: readonly BudgetLine[] | null | undefined,
  nature: BudgetExpenseNatureFilter,
  currency: string,
): BudgetSummaryKpi | undefined {
  if (!nature) return kpi;
  if (!lines?.length) {
    // Filtre actif mais pas de lignes : afficher zéro plutôt que le total global trompeur.
    return aggregateBudgetLinesToSummaryKpi([], currency);
  }
  const scoped = lines.filter((line) => line.expenseType === nature);
  return aggregateBudgetLinesToSummaryKpi(scoped, currency);
}

/**
 * Zone 2 du cockpit (RFC-FE-BUD-032 §3.A, RFC-BUD-040) : bande de 6 indicateurs persistante.
 * Ordre : Budget → Atterrissage → Engagé → Consommé → Restant → Écart d'atterrissage.
 */
export function BudgetDetailKpiStrip({
  kpi,
  currency,
  taxDisplayMode,
  setTaxDisplayMode,
  isTaxLoading,
  isTtcProjection,
  isLoading,
  isError,
  lines = null,
  expenseTypeFilter,
  onExpenseTypeFilterChange,
}: BudgetDetailKpiStripProps) {
  const [internalNature, setInternalNature] = useState<BudgetExpenseNatureFilter>(null);
  const nature: BudgetExpenseNatureFilter =
    expenseTypeFilter !== undefined ? expenseTypeFilter : internalNature;

  const setNature = (value: BudgetExpenseNatureFilter) => {
    if (onExpenseTypeFilterChange) onExpenseTypeFilterChange(value);
    else setInternalNature(value);
  };

  const displayKpi = useMemo(
    () => resolveDisplayKpi(kpi, lines, nature, currency),
    [kpi, lines, nature, currency],
  );

  const cells = useMemo<KpiCell[]>(() => {
    if (!displayKpi) return [];

    const amount = (htValue: number, ttcValue: number | null | undefined) =>
      formatTaxAwareAmount({
        htValue,
        ttcValue: ttcValue ?? null,
        currency,
        mode: taxDisplayMode,
        isApproximation: isTtcProjection,
      });

    const budgetBase = budgetKpiAmountForTaxMode(displayKpi, taxDisplayMode, 'initial');
    const landing = budgetKpiAmountForTaxMode(displayKpi, taxDisplayMode, 'landing');
    const committed = budgetKpiAmountForTaxMode(displayKpi, taxDisplayMode, 'committed');
    const consumed = budgetKpiAmountForTaxMode(displayKpi, taxDisplayMode, 'consumed');
    const remaining = budgetKpiAmountForTaxMode(displayKpi, taxDisplayMode, 'remaining');
    const landingGap =
      displayKpi.landingGapAmount ??
      displayKpi.forecastGapAmount ??
      landing - budgetBase;
    const share = (value: number) => (budgetBase > 0 ? (value / budgetBase) * 100 : 0);

    return [
      {
        id: 'budget',
        label: BUDGET_LABELS.budget,
        value: amount(displayKpi.totalInitialAmount, displayKpi.totalInitialAmountTtc),
        hint: BUDGET_LABEL_HINTS.budget,
        tone: 'brand',
        progress: 100,
      },
      {
        id: 'landing',
        label: BUDGET_LABELS.landing,
        value: amount(
          displayKpi.totalLandingAmount ?? displayKpi.totalForecastAmount,
          displayKpi.totalLandingAmountTtc ?? displayKpi.totalForecastAmountTtc,
        ),
        hint: BUDGET_LABEL_HINTS.landing,
        tone: landing > budgetBase ? 'danger' : 'ok',
        progress: share(landing),
      },
      {
        id: 'committed',
        label: BUDGET_LABELS.committed,
        value: amount(displayKpi.totalCommittedAmount, displayKpi.totalCommittedAmountTtc),
        hint: `${formatPercent(share(committed) / 100)} du budget`,
        tone: consumptionTone(share(committed) / 100),
        progress: share(committed),
      },
      {
        id: 'consumed',
        label: BUDGET_LABELS.consumed,
        value: amount(displayKpi.totalConsumedAmount, displayKpi.totalConsumedAmountTtc),
        hint: `${formatPercent(share(consumed) / 100)} du budget`,
        tone: 'info',
        progress: share(consumed),
      },
      {
        id: 'remaining',
        label: BUDGET_LABELS.remaining,
        value: amount(displayKpi.totalRemainingAmount, displayKpi.totalRemainingAmountTtc),
        hint:
          remaining < 0
            ? 'Budget dépassé'
            : `${formatPercent(share(remaining) / 100)} disponible`,
        tone: remaining < 0 ? 'danger' : 'ok',
        progress: Math.max(0, share(remaining)),
      },
      {
        id: 'landing-gap',
        label: BUDGET_LABELS.landingGap,
        value:
          landingGap !== 0
            ? amount(landingGap, null)
            : '—',
        hint:
          landingGap > 0
            ? `${BUDGET_LABELS.landing} au-delà du budget`
            : landingGap < 0
              ? `${BUDGET_LABELS.landing} sous le plafond`
              : `${BUDGET_LABELS.landing} aligné sur le budget`,
        tone: landingGap > 0 ? 'danger' : landingGap < 0 ? 'ok' : 'brand',
        progress: share(Math.max(0, landingGap)),
      },
    ];
  }, [displayKpi, currency, taxDisplayMode, isTtcProjection]);

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Indicateurs indisponibles</AlertTitle>
        <AlertDescription>
          Impossible de charger les indicateurs de pilotage de ce budget.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading && !displayKpi) {
    return (
      <section className="starium-module" aria-busy>
        <LoadingState rows={1} />
      </section>
    );
  }

  if (cells.length === 0) return null;

  const natureLabel =
    nature === 'CAPEX' ? 'CAPEX' : nature === 'OPEX' ? 'OPEX' : 'toutes natures';

  return (
    <section className="starium-module" data-testid="budget-detail-kpi-strip">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div
          className="starium-tab-group"
          role="group"
          aria-label="Nature de dépense"
        >
          {EXPENSE_NATURE_FILTERS.map((option) => {
            const isActive = nature === option.value;
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={isActive}
                onClick={() => setNature(option.value)}
                className={cn(
                  'starium-tab-btn min-h-11 sm:min-h-9',
                  isActive && 'starium-tab-btn--active',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <TaxDisplayModeToggle
          taxDisplayMode={taxDisplayMode}
          setTaxDisplayMode={setTaxDisplayMode}
          isLoading={isTaxLoading}
        />
      </div>
      <div
        key={nature ?? 'all'}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Indicateurs du budget — ${natureLabel}`}
      >
        {cells.map((cell) => (
          <div key={cell.id} className="starium-kpi-card flex flex-col gap-2 !p-4">
            <div className="min-w-0">
              <span className="starium-kpi-label block leading-snug">{cell.label}</span>
              <div
                className={cn(
                  'starium-kpi-value starium-kpi-value--dense starium-kpi-value--portfolio tabular-nums',
                  cell.id === 'landing-gap' || cell.id === 'remaining'
                    ? toneAmountClass(cell.tone)
                    : 'text-foreground',
                )}
              >
                {cell.value}
              </div>
              <div className="starium-text-muted mt-0.5 text-xs">{cell.hint}</div>
            </div>
            <PortfolioProgressBar
              className="mt-auto"
              value={cell.progress}
              tone={cell.tone}
              label={`${cell.label} : ${cell.value}`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
