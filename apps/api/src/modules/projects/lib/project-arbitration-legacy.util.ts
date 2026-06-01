import type {
  ProjectArbitrationLevelStatus,
  ProjectArbitrationStatus,
} from '@prisma/client';

/** Shared with project-sheet and governance-cycle propagation (RFC-003-D). */
export function deriveLegacyArbitrationStatus(
  metier: ProjectArbitrationLevelStatus,
  comite: ProjectArbitrationLevelStatus | null,
  codir: ProjectArbitrationLevelStatus | null,
): ProjectArbitrationStatus {
  if (codir === 'REFUSE') return 'REJECTED';
  if (codir === 'VALIDE') return 'VALIDATED';
  if (metier === 'VALIDE' || metier === 'SOUMIS_VALIDATION') return 'TO_REVIEW';
  return 'DRAFT';
}
