import { BudgetSnapshotStatus } from '@prisma/client';

export type PaSessionStatus =
  | 'NONE'
  | 'BASELINE_FROZEN'
  | 'SCENARIO_FROZEN'
  | 'VALIDATED'
  | 'APPLIED';

export type PaSnapshotRef = {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
  status: BudgetSnapshotStatus | string;
};

export type PaAuditRef = {
  createdAt: Date;
  arbitratedSnapshotId: string;
};

export type PaSessionResolution = {
  status: PaSessionStatus;
  staleSession: boolean;
  baseline: PaSnapshotRef | null;
  arbitrated: PaSnapshotRef | null;
};

function isActiveSnapshot(snap: PaSnapshotRef): boolean {
  return snap.status === BudgetSnapshotStatus.ACTIVE || snap.status === 'ACTIVE';
}

function pickCurrent(
  latestAny: PaSnapshotRef | null,
): { current: PaSnapshotRef | null; stale: boolean } {
  if (!latestAny) {
    return { current: null, stale: false };
  }
  if (!isActiveSnapshot(latestAny)) {
    return { current: null, stale: true };
  }
  return { current: latestAny, stale: false };
}

function auditMatches(
  audit: PaAuditRef | null,
  arbitrated: PaSnapshotRef | null,
): boolean {
  if (!audit || !arbitrated) {
    return false;
  }
  return (
    audit.arbitratedSnapshotId === arbitrated.id &&
    audit.createdAt.getTime() >= arbitrated.createdAt.getTime()
  );
}

/**
 * RFC-BUD-041 C3 — session courante dérivée (pas de table dédiée).
 * Un nouveau PA_BASELINE plus récent ouvre une nouvelle session.
 * N × PA_ARBITRATED après le même baseline → le plus récent.
 */
export function resolvePaSession(input: {
  latestBaselineAny: PaSnapshotRef | null;
  latestArbitratedAfterBaseline: PaSnapshotRef | null;
  validateAudit: PaAuditRef | null;
  applyAudit: PaAuditRef | null;
}): PaSessionResolution {
  const baselinePick = pickCurrent(input.latestBaselineAny);
  const arbitratedPick = pickCurrent(input.latestArbitratedAfterBaseline);
  const staleSession = baselinePick.stale || arbitratedPick.stale;
  const baseline = baselinePick.current;
  const arbitrated = arbitratedPick.current;

  const validated = auditMatches(input.validateAudit, arbitrated);
  const applied = auditMatches(input.applyAudit, arbitrated);

  let status: PaSessionStatus = 'NONE';
  if (applied) {
    status = 'APPLIED';
  } else if (validated) {
    status = 'VALIDATED';
  } else if (arbitrated) {
    status = 'SCENARIO_FROZEN';
  } else if (baseline) {
    status = 'BASELINE_FROZEN';
  }

  return { status, staleSession, baseline, arbitrated };
}

export function parseArbitratedSnapshotIdFromAudit(
  newValue: unknown,
): string | null {
  if (newValue === null || typeof newValue !== 'object' || Array.isArray(newValue)) {
    return null;
  }
  const id = (newValue as { arbitratedSnapshotId?: unknown }).arbitratedSnapshotId;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}
