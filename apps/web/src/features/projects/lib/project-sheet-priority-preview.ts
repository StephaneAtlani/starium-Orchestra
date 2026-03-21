import { riskCriticalityForRisk } from './risk-criticality';
import type { ProjectRiskApi, ProjectSheetRiskLevel } from '../types/project.types';

/** Aligné sur `apps/api/.../project-sheet-calculators.ts` */

export function riskPenaltyFromLevel(level: ProjectSheetRiskLevel | null): number {
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

export function roiFactor(roi: number | null): number {
  if (roi === null) return 0;
  if (roi > 1) return 2;
  if (roi > 0) return 1;
  if (roi < 0) return -2;
  return 0;
}

export function computeRoiFromCostGain(
  cost: number | undefined,
  gain: number | undefined,
): number | null {
  if (cost == null || cost === 0 || gain == null) return null;
  return (gain - cost) / cost;
}

export function maxOperationalRiskLevel(
  risks: ProjectRiskApi[] | undefined,
): ProjectSheetRiskLevel | null {
  if (!risks?.length) return null;
  let maxRank = 0;
  for (const r of risks) {
    const c = riskCriticalityForRisk(r);
    const rk = c === 'HIGH' ? 3 : c === 'MEDIUM' ? 2 : 1;
    if (rk > maxRank) maxRank = rk;
  }
  if (maxRank === 3) return 'HIGH';
  if (maxRank === 2) return 'MEDIUM';
  return 'LOW';
}

/** Même règle que le backend : niveau fiche si choisi, sinon max des risques métier. */
export function effectiveRiskLevelForSheetPreview(
  riskSelectValue: string,
  unsetToken: string,
  operationalRisks: ProjectRiskApi[] | undefined,
): ProjectSheetRiskLevel | null {
  if (riskSelectValue && riskSelectValue !== unsetToken) {
    return riskSelectValue as ProjectSheetRiskLevel;
  }
  return maxOperationalRiskLevel(operationalRisks);
}

export function computeProjectSheetPriorityScorePreview(input: {
  businessValueScore: number | undefined;
  strategicAlignment: number | undefined;
  urgencyScore: number | undefined;
  effectiveRiskLevel: ProjectSheetRiskLevel | null;
  roi: number | null;
}): number | null {
  const { businessValueScore: bv, strategicAlignment: sa, urgencyScore: us, effectiveRiskLevel, roi } =
    input;
  if (bv === undefined || sa === undefined || us === undefined) return null;
  const base = bv * 0.4 + sa * 0.3 + us * 0.2;
  const penalty = riskPenaltyFromLevel(effectiveRiskLevel);
  const rf = roiFactor(roi);
  return Math.round((base - penalty + rf) * 100) / 100;
}
