import { getExerciseMonthColumnLabels } from '@starium-orchestra/budget-exercise-calendar';

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
