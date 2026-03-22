import { Prisma, ProjectRiskLevel } from '@prisma/client';

/**
 * Champs dérivés persistés sur `Project` lors d’un PATCH fiche (avec `mapToSheetResponse` pour relecture).
 *
 * - **roi** : (estimatedGain − estimatedCost) / estimatedCost — si coût absent ou 0, ou gain absent → null.
 * - **priorityScore** : null si l’un des scores valeur / alignement / urgence est absent ; sinon
 *   `bv*0.4 + sa*0.3 + us*0.2 − riskPenalty(niveau) + roiFactor(roi)` avec
 *   pénalité risque LOW=0, MEDIUM=1, HIGH=2 (niveau effectif = saisie fiche ou agrégat max des risques métier P×I),
 *   et roiFactor : ROI > 1 → +2, > 0 → +1, < 0 → −2, sinon 0.
 *
 * Non persistés dans ce module (voir `ProjectSheetService`) :
 * - **riskLevel** affiché : `Project.riskLevel` ou, si null, max des criticités des `ProjectRisk` (même grille que le pilotage).
 */
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
