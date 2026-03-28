import type { ProjectRiskApi } from '../types/project.types';

/** Buckets pilotage / fiche (3 niveaux) à partir du niveau persisté (4 niveaux). */
export function riskCriticalityForRisk(r: ProjectRiskApi): 'LOW' | 'MEDIUM' | 'HIGH' {
  switch (r.criticalityLevel) {
    case 'CRITICAL':
    case 'HIGH':
      return 'HIGH';
    case 'MEDIUM':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}
