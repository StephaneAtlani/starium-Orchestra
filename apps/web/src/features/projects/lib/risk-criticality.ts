import type { ProjectRiskApi } from '../types/project.types';

function scoreFromTier(t: string): number {
  switch (t) {
    case 'LOW':
      return 1;
    case 'MEDIUM':
      return 2;
    case 'HIGH':
      return 3;
    default:
      return 1;
  }
}

export function riskScore(probability: string, impact: string): number {
  return scoreFromTier(probability) * scoreFromTier(impact);
}

/** Aligné sur `projects-pilotage.service.ts` : LOW 1–3, MEDIUM 4–6, HIGH 7–9 */
export function riskCriticalityFromScore(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score <= 3) return 'LOW';
  if (score <= 6) return 'MEDIUM';
  return 'HIGH';
}

export function riskCriticalityForRisk(r: ProjectRiskApi): 'LOW' | 'MEDIUM' | 'HIGH' {
  return riskCriticalityFromScore(riskScore(r.probability, r.impact));
}
