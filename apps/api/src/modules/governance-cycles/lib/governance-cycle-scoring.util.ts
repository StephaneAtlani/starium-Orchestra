export const GOVERNANCE_CYCLE_SCORE_MIN = 1;
export const GOVERNANCE_CYCLE_SCORE_MAX = 5;

export type GovernanceCycleItemScores = {
  valueScore: number | null;
  riskScore: number | null;
  budgetScore: number | null;
  capacityScore: number | null;
  alignmentScore: number | null;
};

export const GOVERNANCE_CYCLE_ITEM_SCORE_FIELD_NAMES = [
  'valueScore',
  'riskScore',
  'budgetScore',
  'capacityScore',
  'alignmentScore',
] as const;

export type GovernanceCycleItemScoreFieldName =
  (typeof GOVERNANCE_CYCLE_ITEM_SCORE_FIELD_NAMES)[number];

/**
 * priorityScore RFC §4.5 — null si l'un des cinq scores est absent.
 */
export function computePriorityScore(
  scores: GovernanceCycleItemScores,
): number | null {
  const { valueScore, riskScore, budgetScore, capacityScore, alignmentScore } =
    scores;

  if (
    valueScore == null ||
    riskScore == null ||
    budgetScore == null ||
    capacityScore == null ||
    alignmentScore == null
  ) {
    return null;
  }

  return (
    valueScore * 3 +
    alignmentScore * 3 +
    budgetScore * 2 +
    capacityScore * 2 -
    riskScore * 2
  );
}

export function scoresFromDto(
  dto: Partial<Record<GovernanceCycleItemScoreFieldName, number | null | undefined>>,
): GovernanceCycleItemScores {
  return {
    valueScore: dto.valueScore ?? null,
    riskScore: dto.riskScore ?? null,
    budgetScore: dto.budgetScore ?? null,
    capacityScore: dto.capacityScore ?? null,
    alignmentScore: dto.alignmentScore ?? null,
  };
}

export function mergeItemScores(
  existing: GovernanceCycleItemScores,
  dto: Partial<
    Record<GovernanceCycleItemScoreFieldName, number | null | undefined>
  >,
): GovernanceCycleItemScores {
  return {
    valueScore:
      dto.valueScore !== undefined ? dto.valueScore : existing.valueScore,
    riskScore: dto.riskScore !== undefined ? dto.riskScore : existing.riskScore,
    budgetScore:
      dto.budgetScore !== undefined ? dto.budgetScore : existing.budgetScore,
    capacityScore:
      dto.capacityScore !== undefined
        ? dto.capacityScore
        : existing.capacityScore,
    alignmentScore:
      dto.alignmentScore !== undefined
        ? dto.alignmentScore
        : existing.alignmentScore,
  };
}

export function hasScorePatch(dto: Record<string, unknown>): boolean {
  return GOVERNANCE_CYCLE_ITEM_SCORE_FIELD_NAMES.some((key) =>
    Object.prototype.hasOwnProperty.call(dto, key),
  );
}

export function scoresFromItemRow(row: GovernanceCycleItemScores): GovernanceCycleItemScores {
  return {
    valueScore: row.valueScore,
    riskScore: row.riskScore,
    budgetScore: row.budgetScore,
    capacityScore: row.capacityScore,
    alignmentScore: row.alignmentScore,
  };
}
