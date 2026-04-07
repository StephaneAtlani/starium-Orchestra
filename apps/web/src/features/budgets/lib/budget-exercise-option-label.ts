import type { BudgetExerciseSummary } from '../types/budget-list.types';

/** Libellé lisible pour combobox cible de report (valeur métier, pas l’id). */
export function formatBudgetExerciseOptionLabel(ex: BudgetExerciseSummary): string {
  const code = ex.code?.trim();
  const start = new Date(ex.startDate).toLocaleDateString('fr-FR');
  const end = new Date(ex.endDate).toLocaleDateString('fr-FR');
  const period = `${start} – ${end}`;
  if (code) return `${ex.name} (${code}) · ${period}`;
  return `${ex.name} · ${period}`;
}
