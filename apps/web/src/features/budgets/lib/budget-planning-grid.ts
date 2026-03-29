/**
 * Helpers grille pilotage RFC-024 / RFC-023 — projection affichage et payload PUT 12 mois complets.
 * Aucune règle métier budgétaire : agrégations d’affichage et reconstruction de tableaux uniquement.
 */

import type { BudgetLinePlanningMonth } from '../types/budget-line-planning.types';

/** 12 montants indexés [0..11] = mois d’exercice 1..12. */
export type TwelveMonthAmounts = readonly [number, number, number, number, number, number, number, number, number, number, number, number];

/** Trimestres d’exercice T1..T4 (sommes des 3 mois consécutifs). */
export type QuarterlyAmounts = readonly [number, number, number, number];

const ZERO12: TwelveMonthAmounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

/**
 * Normalise la réponse API `months` en tableau de 12 montants (index 0 = mois 1).
 */
export function planningMonthsToTwelveArray(months: BudgetLinePlanningMonth[] | undefined | null): TwelveMonthAmounts {
  const out = [...ZERO12] as unknown as number[];
  if (!months?.length) {
    return out as unknown as TwelveMonthAmounts;
  }
  for (const m of months) {
    const idx = (m.monthIndex ?? m.month ?? 0) - 1;
    if (idx >= 0 && idx < 12) {
      out[idx] = typeof m.amount === 'number' && !Number.isNaN(m.amount) ? m.amount : 0;
    }
  }
  return out as unknown as TwelveMonthAmounts;
}

/**
 * Somme des 12 mois.
 */
export function sumTwelveMonths(amounts: readonly number[]): number {
  if (amounts.length !== 12) {
    throw new RangeError('sumTwelveMonths expects length 12');
  }
  return amounts.reduce((a, b) => a + b, 0);
}

/**
 * Agrégation trimestrielle en lecture seule (T1 = mois 1–3, …).
 */
export function aggregateExerciseQuarters(amounts12: readonly number[]): QuarterlyAmounts {
  if (amounts12.length !== 12) {
    throw new RangeError('aggregateExerciseQuarters expects length 12');
  }
  const q = (from: number, to: number) =>
    amounts12.slice(from, to + 1).reduce((a, b) => a + b, 0);
  return [q(0, 2), q(3, 5), q(6, 8), q(9, 11)] as const;
}

/**
 * Copie mutable des 12 mois pour édition locale.
 */
export function cloneTwelveAmounts(amounts: TwelveMonthAmounts): number[] {
  return [...amounts];
}

/**
 * Met à jour un mois (1–12) et retourne un nouveau tableau de 12 montants.
 */
export function replaceMonthAmount(
  amounts12: readonly number[],
  monthIndex1To12: number,
  amount: number,
): number[] {
  if (amounts12.length !== 12) {
    throw new RangeError('replaceMonthAmount expects length 12');
  }
  if (monthIndex1To12 < 1 || monthIndex1To12 > 12) {
    throw new RangeError('monthIndex1To12 must be 1..12');
  }
  const next = [...amounts12];
  next[monthIndex1To12 - 1] = amount;
  return next;
}

/**
 * Payload PUT manuel : toujours 12 entrées `monthIndex` 1..12 (aucune mise à jour partielle).
 */
export function buildManualPlanningPutPayload(amounts12: readonly number[]): {
  months: { monthIndex: number; amount: number }[];
} {
  if (amounts12.length !== 12) {
    throw new RangeError('buildManualPlanningPutPayload expects length 12');
  }
  return {
    months: amounts12.map((amount, i) => ({
      monthIndex: i + 1,
      amount: typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0,
    })),
  };
}

/** Seuil UX RFC-024 : pagination / lazy au-delà. */
export const BUDGET_PILOTAGE_LINE_THRESHOLD = 50;

export const BUDGET_PILOTAGE_DEFAULT_PAGE_SIZE = 25;

/**
 * Identifiants de lignes à charger pour la page pilotage (pagination si dépassement du seuil).
 */
export function lineIdsForPilotagePage(
  allLineIds: string[],
  pageZeroBased: number,
  pageSize: number = BUDGET_PILOTAGE_DEFAULT_PAGE_SIZE,
): string[] {
  if (allLineIds.length <= BUDGET_PILOTAGE_LINE_THRESHOLD) {
    return [...allLineIds];
  }
  const start = pageZeroBased * pageSize;
  return allLineIds.slice(start, start + pageSize);
}

export function pilotagePageCount(
  totalLines: number,
  pageSize: number = BUDGET_PILOTAGE_DEFAULT_PAGE_SIZE,
): number {
  if (totalLines <= BUDGET_PILOTAGE_LINE_THRESHOLD) {
    return 1;
  }
  return Math.max(1, Math.ceil(totalLines / pageSize));
}

export function twelveAmountsEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== 12 || b.length !== 12) return false;
  return a.every((v, i) => v === b[i]);
}
