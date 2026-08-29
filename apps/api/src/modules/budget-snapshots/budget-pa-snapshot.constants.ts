/**
 * Types d’occasion globaux (seed) pour le rituel Prévision d'atterrissage (RFC-BUD-041).
 * @see ensureGlobalBudgetSnapshotOccasionTypes dans seed.ts
 */
export const PA_SNAPSHOT_OCCASION_CODES = {
  BASELINE: 'PA_BASELINE',
  ARBITRATED: 'PA_ARBITRATED',
  ACTIVATED: 'PA_ACTIVATED',
} as const;

export type PaSnapshotOccasionCode =
  (typeof PA_SNAPSHOT_OCCASION_CODES)[keyof typeof PA_SNAPSHOT_OCCASION_CODES];

const PA_OCCASION_CODE_SET = new Set<string>(Object.values(PA_SNAPSHOT_OCCASION_CODES));

export function isPaSnapshotOccasionCode(
  code: string | null | undefined,
): code is PaSnapshotOccasionCode {
  return typeof code === 'string' && PA_OCCASION_CODE_SET.has(code);
}
