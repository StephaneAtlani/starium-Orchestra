const PERIOD_EMPTY = '—';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatGovernanceCycleDate(value: Date | null | undefined): string {
  if (!value) return PERIOD_EMPTY;
  if (Number.isNaN(value.getTime())) return PERIOD_EMPTY;
  return dateFormatter.format(value);
}

/** Libellé période cycle — aligné sur le FE `formatGovernanceCycleDateRange`. */
export function buildGovernanceCyclePeriodLabel(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
): string {
  if (!startDate && !endDate) return PERIOD_EMPTY;
  if (startDate && endDate) {
    return `${formatGovernanceCycleDate(startDate)} → ${formatGovernanceCycleDate(endDate)}`;
  }
  return formatGovernanceCycleDate(startDate ?? endDate);
}
