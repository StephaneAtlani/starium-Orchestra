import type { BudgetImportPurpose } from '../types/budget-imports.types';

export const IMPORT_PURPOSE_LABELS: Record<BudgetImportPurpose, string> = {
  STRUCTURE: 'Structure budgétaire',
  REALITY: 'Réel comptable',
  MIXED: 'Mixte',
};

export function importPurposeLabel(purpose: BudgetImportPurpose | null | undefined): string {
  if (!purpose) return 'Mixte';
  return IMPORT_PURPOSE_LABELS[purpose] ?? 'Mixte';
}
