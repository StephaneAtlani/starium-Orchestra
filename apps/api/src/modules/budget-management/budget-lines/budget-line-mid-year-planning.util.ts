import {
  classifyReferenceDateInExercise,
  getCurrentExerciseMonthIndex,
} from '@starium-orchestra/budget-exercise-calendar';

/** Mois inclus dans remainingPlanning (mois courant inclus). */
export function remainingPlanningMonthIndexes(
  exerciseStart: Date,
  exerciseEnd: Date,
  referenceDate: Date,
): number[] {
  const pos = classifyReferenceDateInExercise(
    exerciseStart,
    exerciseEnd,
    referenceDate,
  );
  if (pos === 'before') {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }
  if (pos === 'after') {
    return [];
  }
  const current = getCurrentExerciseMonthIndex(
    exerciseStart,
    exerciseEnd,
    referenceDate,
  );
  if (current == null) {
    return [];
  }
  const out: number[] = [];
  for (let i = current; i <= 12; i++) {
    out.push(i);
  }
  return out;
}

/** Répartit `total` (2 décimales) à parts égales ; le reliquat centimes va aux premiers mois. */
export function splitAmountAcrossMonths(
  total: number,
  monthIndexes: readonly number[],
): number[] {
  const months = Array.from({ length: 12 }, () => 0);
  if (monthIndexes.length === 0) {
    return months;
  }
  const cents = Math.round(total * 100);
  const n = monthIndexes.length;
  const base = Math.floor(cents / n);
  let remainder = cents - base * n;
  for (const idx of monthIndexes) {
    if (idx < 1 || idx > 12) continue;
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    months[idx - 1] = (base + extra) / 100;
  }
  return months;
}
