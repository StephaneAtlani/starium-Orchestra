import type { Project, ProjectSheetDecisionLevel } from '@prisma/client';

/**
 * Indique si un niveau passe à une décision terminale (Validé ou Refusé).
 */
function isNewTerminalDecision(
  before: Project['arbitrationMetierStatus'] | null | undefined,
  after: Project['arbitrationMetierStatus'] | null | undefined,
): boolean {
  if (after == null) return false;
  const toValide = before !== 'VALIDE' && after === 'VALIDE';
  const toRefuse = before !== 'REFUSE' && after === 'REFUSE';
  return toValide || toRefuse;
}

/**
 * Détecte les niveaux dont le statut passe à VALIDE ou REFUSE (état persisté avant vs après PATCH).
 * Un snapshot est créé par niveau ainsi « décidé » dans le même PATCH.
 */
export function detectArbitrationTransitionsForSnapshot(
  before: Pick<
    Project,
    'arbitrationMetierStatus' | 'arbitrationComiteStatus' | 'arbitrationCodirStatus'
  >,
  after: Pick<
    Project,
    'arbitrationMetierStatus' | 'arbitrationComiteStatus' | 'arbitrationCodirStatus'
  >,
): ProjectSheetDecisionLevel[] {
  const out: ProjectSheetDecisionLevel[] = [];
  if (isNewTerminalDecision(before.arbitrationMetierStatus, after.arbitrationMetierStatus)) {
    out.push('METIER');
  }
  const cBefore = before.arbitrationComiteStatus ?? null;
  const cAfter = after.arbitrationComiteStatus ?? null;
  if (isNewTerminalDecision(cBefore, cAfter)) {
    out.push('COMITE');
  }
  const dBefore = before.arbitrationCodirStatus ?? null;
  const dAfter = after.arbitrationCodirStatus ?? null;
  if (isNewTerminalDecision(dBefore, dAfter)) {
    out.push('CODIR');
  }
  return out;
}

/** @deprecated Utiliser `detectArbitrationTransitionsForSnapshot` (inclut Refusé). */
export const detectArbitrationTransitionsToValide = detectArbitrationTransitionsForSnapshot;
