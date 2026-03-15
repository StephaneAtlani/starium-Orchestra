/**
 * Formateurs réutilisables pour KPI et listes budget.
 */

export function formatAmount(value: number, currency?: string): string {
  const n = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  return currency ? `${n} ${currency}` : n;
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}
