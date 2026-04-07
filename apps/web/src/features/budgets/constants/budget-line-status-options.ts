/** Aligné sur Prisma `BudgetLineStatus` — valeur API + libellé UI */

export const BUDGET_LINE_STATUS_SELECT_OPTIONS = [
  { value: 'ALL', label: 'Tous les statuts' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'PENDING_VALIDATION', label: 'À valider' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'REJECTED', label: 'Rejeté' },
  { value: 'DEFERRED', label: 'Reporté' },
  { value: 'CLOSED', label: 'Clôturé' },
  { value: 'ARCHIVED', label: 'Archivé' },
] as const;

/** Édition / workflow (sans « Tous »). */
export const BUDGET_LINE_STATUS_EDIT_OPTIONS = [
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'PENDING_VALIDATION', label: 'À valider' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'REJECTED', label: 'Rejeté' },
  { value: 'DEFERRED', label: 'Reporté' },
  { value: 'CLOSED', label: 'Clôturé' },
  { value: 'ARCHIVED', label: 'Archivé' },
] as const;

const LABEL_BY_STATUS: Record<string, string> = Object.fromEntries(
  BUDGET_LINE_STATUS_SELECT_OPTIONS.filter((o) => o.value !== 'ALL').map((o) => [
    o.value,
    o.label,
  ]),
);

export function budgetLineStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return LABEL_BY_STATUS[status] ?? status;
}

/** Libellé du filtre statut (inclut « Tous les statuts » pour ALL). */
export function budgetLineStatusFilterLabel(value: string | null | undefined): string {
  const v = value ?? 'ALL';
  const opt = BUDGET_LINE_STATUS_SELECT_OPTIONS.find((o) => o.value === v);
  return opt?.label ?? v;
}
