import { formatNumberFr } from '@/lib/currency-format';

export function formatGovernanceCycleDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatGovernanceCycleDateRange(
  startDate: string | null,
  endDate: string | null,
): string {
  if (!startDate && !endDate) return '—';
  if (startDate && endDate) {
    return `${formatGovernanceCycleDate(startDate)} → ${formatGovernanceCycleDate(endDate)}`;
  }
  return formatGovernanceCycleDate(startDate ?? endDate);
}

export function formatGovernanceCycleDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Montant API (string décimale) → affichage FR. */
export function formatGovernanceDecimalAmount(value: string | null | undefined): string {
  if (value == null || value.trim() === '') return '—';
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return '—';
  return formatNumberFr(n, { minFraction: 2, maxFraction: 2 });
}

export function formatGovernanceCapacityDays(value: string | null | undefined): string {
  const formatted = formatGovernanceDecimalAmount(value);
  if (formatted === '—') return '—';
  return `${formatted} j`;
}

export function formatGovernancePriorityScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatNumberFr(value, { minFraction: 0, maxFraction: 2 });
}

export function getGovernanceCycleItemDisplayLabel(item: {
  title: string;
  sourceRef: { label: string } | null;
}): string {
  return item.sourceRef?.label?.trim() || item.title?.trim() || '—';
}
