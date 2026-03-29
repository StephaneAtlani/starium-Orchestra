/**
 * Calendrier d'exercice budgétaire : monthIndex 1–12 alignés sur le mois calendaire UTC
 * de BudgetExercise.startDate (mois 1 = mois de startDate, puis +1 mois civile jusqu'à 12).
 */

/** Mois courts FR pour en-têtes UI (ordre Jan..Déc ; rotation via index). */
export const FRENCH_MONTH_LABELS_SHORT = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
] as const;

export type ExerciseTimelinePosition = 'before' | 'during' | 'after';

export function addCalendarMonthsUtc(
  year: number,
  monthIndex0: number,
  deltaMonths: number,
): { year: number; monthIndex0: number } {
  const total = year * 12 + monthIndex0 + deltaMonths;
  const y = Math.floor(total / 12);
  const m0 = ((total % 12) + 12) % 12;
  return { year: y, monthIndex0: m0 };
}

/** Mois 1 = mois calendaire UTC de exerciseStartDate. */
export function getExerciseMonthCalendarYearMonth(
  exerciseStartDate: Date,
  monthIndex1To12: number,
): { year: number; monthIndex0: number } {
  if (monthIndex1To12 < 1 || monthIndex1To12 > 12) {
    throw new RangeError('monthIndex must be between 1 and 12');
  }
  const y = exerciseStartDate.getUTCFullYear();
  const m0 = exerciseStartDate.getUTCMonth();
  return addCalendarMonthsUtc(y, m0, monthIndex1To12 - 1);
}

/** Premier instant UTC du 1er jour du mois d'exercice (mois 1). */
export function getExerciseFirstMonthStartUtc(exerciseStartDate: Date): number {
  return Date.UTC(
    exerciseStartDate.getUTCFullYear(),
    exerciseStartDate.getUTCMonth(),
    1,
  );
}

/** Dernier instant UTC du jour exerciseEndDate. */
export function getExerciseEndInstantUtc(exerciseEndDate: Date): number {
  return Date.UTC(
    exerciseEndDate.getUTCFullYear(),
    exerciseEndDate.getUTCMonth(),
    exerciseEndDate.getUTCDate(),
    23,
    59,
    59,
    999,
  );
}

export function classifyReferenceDateInExercise(
  exerciseStartDate: Date,
  exerciseEndDate: Date,
  referenceDate: Date,
): ExerciseTimelinePosition {
  const startOfExercise = getExerciseFirstMonthStartUtc(exerciseStartDate);
  const endInstant = getExerciseEndInstantUtc(exerciseEndDate);
  const t = referenceDate.getTime();
  if (t < startOfExercise) {
    return 'before';
  }
  if (t > endInstant) {
    return 'after';
  }
  return 'during';
}

/**
 * Pendant l'exercice : index 1–12 du mois d'exercice contenant referenceDate (UTC year/month).
 */
export function getCurrentExerciseMonthIndex(
  exerciseStartDate: Date,
  exerciseEndDate: Date,
  referenceDate: Date,
): number | null {
  const pos = classifyReferenceDateInExercise(
    exerciseStartDate,
    exerciseEndDate,
    referenceDate,
  );
  if (pos !== 'during') {
    return null;
  }
  const refY = referenceDate.getUTCFullYear();
  const refM = referenceDate.getUTCMonth();
  for (let k = 1; k <= 12; k++) {
    const ym = getExerciseMonthCalendarYearMonth(exerciseStartDate, k);
    if (ym.year === refY && ym.monthIndex0 === refM) {
      return k;
    }
  }
  /** Pendant [start,end] mais hors des 12 mois civils alignés (ex. trou) — dernier mois ≤ ref. */
  const refMs = referenceDate.getTime();
  for (let k = 12; k >= 1; k--) {
    const ym = getExerciseMonthCalendarYearMonth(exerciseStartDate, k);
    const firstDayK = Date.UTC(ym.year, ym.monthIndex0, 1);
    if (refMs >= firstDayK) {
      return k;
    }
  }
  return 1;
}

/**
 * Montants indexés [0..11] = monthIndex 1..12.
 */
export function computeRemainingPlanningAmount(
  exerciseStartDate: Date,
  exerciseEndDate: Date,
  referenceDate: Date,
  amountsByMonthIndex12: readonly number[],
): number {
  if (amountsByMonthIndex12.length !== 12) {
    throw new RangeError('amountsByMonthIndex12 must have length 12');
  }
  const pos = classifyReferenceDateInExercise(
    exerciseStartDate,
    exerciseEndDate,
    referenceDate,
  );
  if (pos === 'before') {
    return amountsByMonthIndex12.reduce((a, b) => a + b, 0);
  }
  if (pos === 'after') {
    return 0;
  }
  const current = getCurrentExerciseMonthIndex(
    exerciseStartDate,
    exerciseEndDate,
    referenceDate,
  );
  if (current === null) {
    return 0;
  }
  let sum = 0;
  for (let i = current - 1; i < 12; i++) {
    sum += amountsByMonthIndex12[i] ?? 0;
  }
  return sum;
}

/** Libellés courts des 12 colonnes (ordre = monthIndex 1..12). */
export function getExerciseMonthColumnLabels(exerciseStartDate: Date): string[] {
  const startM = exerciseStartDate.getUTCMonth();
  return Array.from(
    { length: 12 },
    (_, i) => FRENCH_MONTH_LABELS_SHORT[(startM + i) % 12] as string,
  );
}

/**
 * Date de référence par défaut : minuit UTC du jour courant (pas Date.now() épars hors d'ici).
 */
export function defaultReferenceDateUtc(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
