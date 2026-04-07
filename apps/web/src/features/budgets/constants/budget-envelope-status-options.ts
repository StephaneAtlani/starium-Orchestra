/** Aligné sur Prisma `BudgetEnvelopeStatus` */

export const BUDGET_ENVELOPE_STATUS_EDIT_OPTIONS = [
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'PENDING_VALIDATION', label: 'À valider' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'REJECTED', label: 'Rejeté' },
  { value: 'DEFERRED', label: 'Reporté' },
  { value: 'LOCKED', label: 'Verrouillé' },
  { value: 'ARCHIVED', label: 'Archivé' },
] as const;

const LABEL_BY_STATUS: Record<string, string> = Object.fromEntries(
  BUDGET_ENVELOPE_STATUS_EDIT_OPTIONS.map((o) => [o.value, o.label]),
);

export function budgetEnvelopeStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return LABEL_BY_STATUS[status] ?? status;
}
