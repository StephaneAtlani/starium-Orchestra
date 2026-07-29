import { BUDGET_STATUS_OPTIONS } from '../constants/budget-filters';
import type { BudgetListItemWithKpi } from '../types/budget-reporting.types';

export function formatBudgetAmount(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRate(rate: number | undefined | null): string {
  if (rate == null || !Number.isFinite(rate)) return '—';
  return `${Math.round(rate * 100)} %`;
}

export function budgetStatusLabel(status: string): string {
  return (
    BUDGET_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  );
}

export function isBudgetRowAlert(row: BudgetListItemWithKpi): boolean {
  if (row.kpi.forecastGapAmount != null && row.kpi.forecastGapAmount > 0) return true;
  if ((row.kpi.overConsumedLineCount ?? 0) > 0) return true;
  if ((row.kpi.overCommittedLineCount ?? 0) > 0) return true;
  if (row.kpi.totalRemainingAmount < 0) return true;
  if ((row.kpi.consumptionRate ?? 0) >= 1) return true;
  return false;
}
