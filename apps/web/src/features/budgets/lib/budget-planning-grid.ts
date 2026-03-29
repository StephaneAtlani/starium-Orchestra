/**
 * Helpers grille planning RFC-023 / RFC-024 — agrégations d’affichage et payload PUT 12 mois complets.
 * Aucune règle métier backend dupliquée ici : uniquement formes de données et sommes.
 */

import type { BudgetLinePlanningMonth } from '../types/budget-line-planning.types';

/** 12 montants indexés [0..11] = monthIndex 1..12 (alignés exercice). */
export type Amounts12 = readonly [number, number, number, number, number, number, number, number, number, number, number, number];

function isAmounts12(a: readonly number[]): a is Amounts12 {
  return a.length === 12;
}

/**
 * Construit un tuple de 12 montants depuis la réponse API (mois éventuellement partiels).
 */
export function amounts12FromPlanningMonths(months: BudgetLinePlanningMonth[]): Amounts12 {
  const out = Array.from({ length: 12 }, () => 0);
  for (const m of months) {
    const idx = m.monthIndex ?? m.month ?? 0;
    if (idx >= 1 && idx <= 12) {
      out[idx - 1] = typeof m.amount === 'number' && !Number.isNaN(m.amount) ? m.amount : 0;
    }
  }
  if (!isAmounts12(out)) {
    throw new Error('amounts12FromPlanningMonths: internal length error');
  }
  return out;
}

/**
 * Agrège les 12 mois en 4 trimestres (T1 = mois 1–3, …). Lecture seule (affichage condensé).
 */
export function aggregateMonthsToQuarters(amounts12: readonly number[]): [number, number, number, number] {
  if (amounts12.length !== 12) {
    throw new RangeError('aggregateMonthsToQuarters: expected 12 amounts');
  }
  const q = (start: number) =>
    amounts12[start] + amounts12[start + 1] + amounts12[start + 2];
  return [q(0), q(3), q(6), q(9)];
}

/** Total annuel (somme des 12 mois). */
export function sumAmounts12(amounts12: readonly number[]): number {
  if (amounts12.length !== 12) {
    throw new RangeError('sumAmounts12: expected 12 amounts');
  }
  return amounts12.reduce((a, b) => a + b, 0);
}

/**
 * Payload PUT manuel : 12 entrées monthIndex 1..12 — **toujours complet** (aucune mise à jour partielle).
 */
export function buildManualPlanningPutPayload(amounts12: Amounts12): {
  months: { monthIndex: number; amount: number }[];
} {
  return {
    months: amounts12.map((amount, i) => ({ monthIndex: i + 1, amount })),
  };
}

/**
 * Copie les 12 montants en modifiant un seul index (0..11).
 */
export function replaceMonthAmount(amounts12: Amounts12, monthIndex0: number, amount: number): Amounts12 {
  if (monthIndex0 < 0 || monthIndex0 > 11) {
    throw new RangeError('replaceMonthAmount: monthIndex0 must be 0..11');
  }
  const next = [...amounts12] as number[];
  next[monthIndex0] = amount;
  if (!isAmounts12(next)) {
    throw new Error('replaceMonthAmount: internal length error');
  }
  return next;
}
