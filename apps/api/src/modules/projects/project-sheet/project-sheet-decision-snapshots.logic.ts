import type { Project, ProjectSheetDecisionLevel } from '@prisma/client';

/**
 * Snapshot si le statut du niveau change et qu’au moins l’ancien ou le nouveau est Validé / Refusé
 * (arrivée sur une décision terminale, sortie, ou bascule Validé ↔ Refusé).
 */
function isLevelSnapshotWorthy(
  before: Project['arbitrationMetierStatus'] | null | undefined,
  after: Project['arbitrationMetierStatus'] | null | undefined,
): boolean {
  if (before === after) return false;
  const terminal = (s: typeof before) => s === 'VALIDE' || s === 'REFUSE';
  return Boolean(terminal(before) || terminal(after));
}

/**
 * Détecte les niveaux dont le statut d’arbitrage change avec implication Validé/Refusé (état avant vs après PATCH).
 * Un snapshot est créé par niveau concerné dans le même PATCH.
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
  if (isLevelSnapshotWorthy(before.arbitrationMetierStatus, after.arbitrationMetierStatus)) {
    out.push('METIER');
  }
  const cBefore = before.arbitrationComiteStatus ?? null;
  const cAfter = after.arbitrationComiteStatus ?? null;
  if (isLevelSnapshotWorthy(cBefore, cAfter)) {
    out.push('COMITE');
  }
  const dBefore = before.arbitrationCodirStatus ?? null;
  const dAfter = after.arbitrationCodirStatus ?? null;
  if (isLevelSnapshotWorthy(dBefore, dAfter)) {
    out.push('CODIR');
  }
  return out;
}

/** @deprecated Utiliser `detectArbitrationTransitionsForSnapshot` (inclut Refusé). */
export const detectArbitrationTransitionsToValide = detectArbitrationTransitionsForSnapshot;
