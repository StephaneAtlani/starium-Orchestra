import { Prisma, ProjectRiskLevel } from '@prisma/client';

/** ROI = (gain - coût) / coût ; coût null ou 0 → null */
export function computeRoi(
  estimatedCost: Prisma.Decimal | null | undefined,
  estimatedGain: Prisma.Decimal | null | undefined,
): Prisma.Decimal | null {
  if (estimatedCost == null) return null;
  if (estimatedCost.equals(0)) return null;
  if (estimatedGain == null) return null;
  return estimatedGain.minus(estimatedCost).div(estimatedCost);
}

export function riskPenaltyFromLevel(level: ProjectRiskLevel | null | undefined): number {
  switch (level) {
    case 'LOW':
      return 0;
    case 'MEDIUM':
      return 1;
    case 'HIGH':
      return 2;
    default:
      return 0;
  }
}

/** ROI null → 0 ; sinon seuils RFC-PROJ-012 */
export function roiFactor(roi: Prisma.Decimal | null): number {
  if (roi === null) return 0;
  if (roi.gt(1)) return 2;
  if (roi.gt(0)) return 1;
  if (roi.lt(0)) return -2;
  return 0;
}

/**
 * Priorité MVP : null si un des trois scores entiers est absent.
 * Formule : (bv*0.4)+(sa*0.3)+(us*0.2) - riskPenalty + roiFactor(roi)
 */
export function computePriorityScore(
  businessValueScore: number | null | undefined,
  strategicAlignment: number | null | undefined,
  urgencyScore: number | null | undefined,
  riskLevel: ProjectRiskLevel | null | undefined,
  roi: Prisma.Decimal | null,
): Prisma.Decimal | null {
  if (
    businessValueScore == null ||
    strategicAlignment == null ||
    urgencyScore == null
  ) {
    return null;
  }
  const base =
    businessValueScore * 0.4 +
    strategicAlignment * 0.3 +
    urgencyScore * 0.2;
  const penalty = riskPenaltyFromLevel(riskLevel ?? null);
  const rf = roiFactor(roi);
  return new Prisma.Decimal(base - penalty + rf).toDecimalPlaces(2);
}
