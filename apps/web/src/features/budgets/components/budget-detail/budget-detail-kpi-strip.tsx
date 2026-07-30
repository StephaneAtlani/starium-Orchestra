'use client';

import { useMemo } from 'react';
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
import { BUDGET_LABELS } from '@/features/budgets/lib/budget-display-labels';
import type { BudgetSummaryKpi } from '@/features/budgets/types/budget-reporting.types';

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
  /** Filtre nature (Tout / CAPEX / OPEX) — mockup `#budgets-detail`. */
  expenseTypeFilter?: string | null;
  onExpenseTypeFilterChange?: (value: string | null) => void;
}

const EXPENSE_NATURE_FILTERS: { label: string; value: string | null }[] = [
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

/**
 * Zone 2 du cockpit (RFC-FE-BUD-032 §3.A) : bande de 6 indicateurs persistante sur tous les
 * onglets, alignée sur le mockup `#budgets-detail` (libellé, valeur, précision, barre).
 * Montants issus de l'API reporting (`*Ttc` inclus) — aucun agrégat recalculé côté client.
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
  expenseTypeFilter = null,
  onExpenseTypeFilterChange,
}: BudgetDetailKpiStripProps) {
  const cells = useMemo<KpiCell[]>(() => {
    if (!kpi) return [];

    const amount = (htValue: number, ttcValue: number | null | undefined) =>
      formatTaxAwareAmount({
        htValue,
        ttcValue: ttcValue ?? null,
        currency,
        mode: taxDisplayMode,
        isApproximation: isTtcProjection,
      });

    const budgetBase = budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'initial');
    const forecast = budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'forecast');
    const committed = budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'committed');
    const consumed = budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'consumed');
    const remaining = budgetKpiAmountForTaxMode(kpi, taxDisplayMode, 'remaining');
    const overrun = Math.max(0, forecast - budgetBase);
    const share = (value: number) => (budgetBase > 0 ? (value / budgetBase) * 100 : 0);
    const executionRate = budgetBase > 0 ? consumed / budgetBase : 0;

    return [
      {
        id: 'budget',
        label: BUDGET_LABELS.budget,
        value: amount(kpi.totalInitialAmount, kpi.totalInitialAmountTtc),
        hint: 'Plafond voté, réaffectations incluses',
        tone: 'brand',
        progress: 100,
      },
      {
        id: 'committed',
        label: BUDGET_LABELS.committed,
        value: amount(kpi.totalCommittedAmount, kpi.totalCommittedAmountTtc),
        hint: `${formatPercent(share(committed) / 100)} du budget`,
        tone: consumptionTone(share(committed) / 100),
        progress: share(committed),
      },
      {
        id: 'consumed',
        label: BUDGET_LABELS.consumed,
        value: amount(kpi.totalConsumedAmount, kpi.totalConsumedAmountTtc),
        hint: `${formatPercent(share(consumed) / 100)} du budget`,
        tone: 'info',
        progress: share(consumed),
      },
      {
        id: 'remaining',
        label: BUDGET_LABELS.remaining,
        value: amount(kpi.totalRemainingAmount, kpi.totalRemainingAmountTtc),
        hint: remaining < 0 ? 'Budget dépassé' : `${formatPercent(share(remaining) / 100)} disponible`,
        tone: remaining < 0 ? 'danger' : 'ok',
        progress: Math.max(0, share(remaining)),
      },
      {
        id: 'overrun',
        label: 'Dépassement',
        value: overrun > 0 ? amount(overrun, null) : '—',
        hint:
          overrun > 0
            ? `${BUDGET_LABELS.forecast} au-delà du budget`
            : `${BUDGET_LABELS.forecast} ${amount(kpi.totalForecastAmount, kpi.totalForecastAmountTtc)}`,
        tone: overrun > 0 ? 'danger' : 'ok',
        progress: share(overrun),
      },
      {
        id: 'execution',
        label: "Taux d'exécution",
        value: formatPercent(executionRate),
        hint: `${BUDGET_LABELS.consumed} sur budget`,
        tone: consumptionTone(executionRate),
        progress: executionRate * 100,
      },
    ];
  }, [kpi, currency, taxDisplayMode, isTtcProjection]);

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

  if (isLoading && !kpi) {
    return (
      <section className="starium-module" aria-busy>
        <LoadingState rows={1} />
      </section>
    );
  }

  if (cells.length === 0) return null;

  return (
    <section className="starium-module" data-testid="budget-detail-kpi-strip">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {onExpenseTypeFilterChange ? (
          <div
            className="starium-tab-group"
            role="group"
            aria-label="Nature de dépense"
          >
            {EXPENSE_NATURE_FILTERS.map((option) => {
              const isActive = expenseTypeFilter === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onExpenseTypeFilterChange(option.value)}
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
        ) : (
          <h2 className="starium-overline">Indicateurs du budget</h2>
        )}
        <TaxDisplayModeToggle
          taxDisplayMode={taxDisplayMode}
          setTaxDisplayMode={setTaxDisplayMode}
          isLoading={isTaxLoading}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {cells.map((cell) => (
          <div key={cell.id} className="starium-kpi-card flex flex-col gap-2 !p-4">
            <div className="min-w-0">
              <span className="starium-kpi-label block leading-snug">{cell.label}</span>
              <div
                className={cn(
                  'starium-kpi-value starium-kpi-value--dense starium-kpi-value--portfolio tabular-nums',
                  cell.id === 'overrun' || cell.id === 'remaining'
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
