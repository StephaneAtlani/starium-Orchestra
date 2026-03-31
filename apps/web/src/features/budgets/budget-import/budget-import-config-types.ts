/** Sous-étapes Configuration (wizard import) — ordre fixe Précédent / Suivant. */
export const BUDGET_IMPORT_CONFIG_BLOCK_ORDER = [
  'file_sheet',
  'envelope',
  'budget_line',
  'orders',
  'invoices',
  'options',
] as const;

export type BudgetImportConfigBlockId = (typeof BUDGET_IMPORT_CONFIG_BLOCK_ORDER)[number];

export function budgetImportConfigBlockIndex(id: BudgetImportConfigBlockId): number {
  return BUDGET_IMPORT_CONFIG_BLOCK_ORDER.indexOf(id);
}
