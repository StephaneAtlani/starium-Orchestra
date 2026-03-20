/**
 * Formateurs réutilisables pour KPI et listes budget.
 */

import {
  formatCurrencyAmountFr,
  formatNumberFr,
  normalizeFrNumberGrouping,
} from '@/lib/currency-format';

export function formatAmount(value: number, currency?: string): string {
  if (!currency) {
    return formatNumberFr(value);
  }
  return formatCurrencyAmountFr(value, currency);
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
