import { BudgetSnapshotStatus } from '@prisma/client';
import {
  parseArbitratedSnapshotIdFromAudit,
  resolvePaSession,
  type PaSnapshotRef,
} from './pa-session.util';

function snap(
  id: string,
  createdAt: string,
  status: BudgetSnapshotStatus = BudgetSnapshotStatus.ACTIVE,
): PaSnapshotRef {
  return {
    id,
    name: id,
    code: id,
    createdAt: new Date(createdAt),
    status,
  };
}

describe('resolvePaSession (C3)', () => {
  it('NONE sans baseline ni arbitrated', () => {
    const r = resolvePaSession({
      latestBaselineAny: null,
      latestArbitratedAfterBaseline: null,
      validateAudit: null,
      applyAudit: null,
    });
    expect(r.status).toBe('NONE');
    expect(r.staleSession).toBe(false);
  });

  it('BASELINE_FROZEN après PA_BASELINE', () => {
    const r = resolvePaSession({
      latestBaselineAny: snap('b1', '2026-03-01T00:00:00.000Z'),
      latestArbitratedAfterBaseline: null,
      validateAudit: null,
      applyAudit: null,
    });
    expect(r.status).toBe('BASELINE_FROZEN');
    expect(r.baseline?.id).toBe('b1');
  });

  it('un 2e PA_BASELINE reset la session (ignore l’arbitrated antérieur)', () => {
    const r = resolvePaSession({
      latestBaselineAny: snap('b2', '2026-06-01T00:00:00.000Z'),
      latestArbitratedAfterBaseline: null,
      validateAudit: {
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        arbitratedSnapshotId: 'a-old',
      },
      applyAudit: null,
    });
    expect(r.status).toBe('BASELINE_FROZEN');
    expect(r.arbitrated).toBeNull();
  });

  it('SCENARIO_FROZEN puis VALIDATED puis APPLIED pour le même arbitrated', () => {
    const arb = snap('a1', '2026-04-01T00:00:00.000Z');
    const frozen = resolvePaSession({
      latestBaselineAny: snap('b1', '2026-03-01T00:00:00.000Z'),
      latestArbitratedAfterBaseline: arb,
      validateAudit: null,
      applyAudit: null,
    });
    expect(frozen.status).toBe('SCENARIO_FROZEN');

    const validated = resolvePaSession({
      latestBaselineAny: snap('b1', '2026-03-01T00:00:00.000Z'),
      latestArbitratedAfterBaseline: arb,
      validateAudit: {
        createdAt: new Date('2026-04-02T00:00:00.000Z'),
        arbitratedSnapshotId: 'a1',
      },
      applyAudit: null,
    });
    expect(validated.status).toBe('VALIDATED');

    const applied = resolvePaSession({
      latestBaselineAny: snap('b1', '2026-03-01T00:00:00.000Z'),
      latestArbitratedAfterBaseline: arb,
      validateAudit: {
        createdAt: new Date('2026-04-02T00:00:00.000Z'),
        arbitratedSnapshotId: 'a1',
      },
      applyAudit: {
        createdAt: new Date('2026-04-03T00:00:00.000Z'),
        arbitratedSnapshotId: 'a1',
      },
    });
    expect(applied.status).toBe('APPLIED');
  });

  it('un validate d’un vieux arbitrated ne compte pas', () => {
    const r = resolvePaSession({
      latestBaselineAny: snap('b1', '2026-03-01T00:00:00.000Z'),
      latestArbitratedAfterBaseline: snap('a-new', '2026-05-01T00:00:00.000Z'),
      validateAudit: {
        createdAt: new Date('2026-04-02T00:00:00.000Z'),
        arbitratedSnapshotId: 'a-old',
      },
      applyAudit: null,
    });
    expect(r.status).toBe('SCENARIO_FROZEN');
  });

  it('snapshot ARCHIVED → staleSession, status retombe', () => {
    const r = resolvePaSession({
      latestBaselineAny: snap(
        'b1',
        '2026-03-01T00:00:00.000Z',
        BudgetSnapshotStatus.ARCHIVED,
      ),
      latestArbitratedAfterBaseline: null,
      validateAudit: null,
      applyAudit: null,
    });
    expect(r.staleSession).toBe(true);
    expect(r.status).toBe('NONE');
    expect(r.baseline).toBeNull();
  });
});

describe('parseArbitratedSnapshotIdFromAudit', () => {
  it('extrait l’id', () => {
    expect(
      parseArbitratedSnapshotIdFromAudit({ arbitratedSnapshotId: 'snap-1' }),
    ).toBe('snap-1');
  });

  it('rejette un payload invalide', () => {
    expect(parseArbitratedSnapshotIdFromAudit(null)).toBeNull();
    expect(parseArbitratedSnapshotIdFromAudit('x')).toBeNull();
  });
});
