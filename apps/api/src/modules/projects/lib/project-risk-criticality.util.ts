import type { ProjectRiskCriticality } from '@prisma/client';

/** Score = probability × impact (1–5 chacun → 1–25). */
export function computeCriticalityScore(probability: number, impact: number): number {
  return probability * impact;
}

/** Seuils MVP RFC-PROJ-RISK-001. */
export function criticalityLevelFromScore(score: number): ProjectRiskCriticality {
  if (score <= 4) return 'LOW';
  if (score <= 9) return 'MEDIUM';
  if (score <= 16) return 'HIGH';
  return 'CRITICAL';
}

export function applyCriticalityFromProbabilityImpact(
  probability: number,
  impact: number,
): { criticalityScore: number; criticalityLevel: ProjectRiskCriticality } {
  const criticalityScore = computeCriticalityScore(probability, impact);
  return {
    criticalityScore,
    criticalityLevel: criticalityLevelFromScore(criticalityScore),
  };
}
