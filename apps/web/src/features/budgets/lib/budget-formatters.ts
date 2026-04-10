/**
 * Formateurs réutilisables pour KPI et listes budget.
 */

import {
  formatCurrencyAmountFr,
  formatNumberFr,
  normalizeFrNumberGrouping,
} from '@/lib/currency-format';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetSummaryKpi } from '@/features/budgets/types/budget-reporting.types';

export function formatAmount(value: number, currency?: string): string {
  if (!currency) {
    return formatNumberFr(value);
  }
  return formatCurrencyAmountFr(value, currency);
}

/**
 * Montants DAF — forecast & comparaison (2 décimales, séparateurs milliers, symbole devise).
 * `currency` null → EUR par défaut (aligné pilotage budget).
 */
export function formatCurrency(amount: number, currency: string | null): string {
  const code = currency?.trim() || 'EUR';
  try {
    return normalizeFrNumberGrouping(
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount),
    );
  } catch {
    return formatNumberFr(amount, { minFraction: 2, maxFraction: 2 });
  }
}

export function formatPercent(value: number): string {
  return normalizeFrNumberGrouping(
    new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value),
  );
}

/**
 * Écart relatif (a − b) / b, formaté en % signé. `null` si dénominateur nul / non fini.
 */
export function formatSignedDeltaPercent(a: number, b: number): string | null {
  if (b === 0 || !Number.isFinite(b) || !Number.isFinite(a)) return null;
  const ratio = (a - b) / b;
  const abs = formatPercent(Math.abs(ratio));
  if (ratio > 0) return `+${abs}`;
  if (ratio < 0) return `−${abs}`;
  return abs;
}

/**
 * Montant agrégé (HT ou TTC) aligné sur l’affichage cockpit — pour ratios cohérents avec les cartes KPI.
 */
export function budgetKpiAmountForTaxMode(
  kpi: BudgetSummaryKpi,
  mode: TaxDisplayMode,
  field: 'initial' | 'forecast',
): number {
  if (mode === 'TTC') {
    const ttc =
      field === 'initial'
        ? kpi.totalInitialAmountTtc
        : kpi.totalForecastAmountTtc;
    if (ttc != null && Number.isFinite(ttc)) return ttc;
  }
  return field === 'initial' ? kpi.totalInitialAmount : kpi.totalForecastAmount;
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
