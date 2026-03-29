/**
 * Libellés des 12 colonnes mois — source unique alignée RFC-023 / package calendrier.
 * Ne pas utiliser `monthColumnLabels` renvoyé par GET planning (éviter course / ordre de chargement).
 */

import { getExerciseMonthColumnLabels } from '@starium-orchestra/budget-exercise-calendar';

/**
 * @param exerciseStartDateIso — `BudgetExercise.startDate` (ISO 8601).
 */
export function getBudgetPilotageMonthColumnLabels(exerciseStartDateIso: string): string[] {
  const d = new Date(exerciseStartDateIso);
  if (Number.isNaN(d.getTime())) {
    throw new RangeError('Invalid exercise startDate for month labels');
  }
  return getExerciseMonthColumnLabels(d);
}
