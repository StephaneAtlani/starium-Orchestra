import { getExerciseMonthColumnLabels } from '@starium-orchestra/budget-exercise-calendar';

/** Référence stable janv. → déc. (année civile) pour libellés quand l’exercice n’est pas encore résolu. */
const DEFAULT_LABEL_ANCHOR_UTC = new Date(Date.UTC(2020, 0, 1));

/**
 * Libellés des 12 colonnes mensuelles — **source unique** alignée RFC-023 (exercice),
 * jamais dérivés du « premier planning chargé ».
 */
export function getBudgetMonthColumnLabelsFromExerciseStartIso(
  exerciseStartDateIso: string,
): string[] {
  const d = new Date(exerciseStartDateIso);
  if (Number.isNaN(d.getTime())) {
    throw new RangeError('Invalid exercise start date');
  }
  return getExerciseMonthColumnLabels(d);
}

/**
 * Toujours 12 libellés : exercice si disponible et valide, sinon année civile (janv.–déc.).
 * Permet d’activer le chargement planning sans bloquer sur l’exercice ou une date invalide.
 */
export function getBudgetMonthColumnLabelsSafe(
  exerciseStartDateIso: string | null | undefined,
): string[] {
  if (!exerciseStartDateIso) {
    return getExerciseMonthColumnLabels(DEFAULT_LABEL_ANCHOR_UTC);
  }
  try {
    return getBudgetMonthColumnLabelsFromExerciseStartIso(exerciseStartDateIso);
  } catch {
    return getExerciseMonthColumnLabels(DEFAULT_LABEL_ANCHOR_UTC);
  }
}
