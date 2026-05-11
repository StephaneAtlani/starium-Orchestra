import { describe, expect, it } from 'vitest';
import {
  computeEffectiveAdminCapacity,
  wouldRemovingEntryRemoveLastAdmin,
} from './admin-capacity';
import type { ResourceAclEntry } from '../api/resource-acl.types';

function makeEntry(
  partial: Partial<ResourceAclEntry> & { id: string },
): ResourceAclEntry {
  return {
    id: partial.id,
    subjectType: partial.subjectType ?? 'USER',
    subjectId: partial.subjectId ?? 'subject',
    permission: partial.permission ?? 'READ',
    subjectLabel: partial.subjectLabel ?? 'subject-label',
    createdAt: partial.createdAt ?? '2026-05-01T00:00:00Z',
    updatedAt: partial.updatedAt ?? '2026-05-01T00:00:00Z',
  };
}

describe('computeEffectiveAdminCapacity', () => {
  it('USER seul ADMIN sur le current user → 1 source USER', () => {
    const snap = computeEffectiveAdminCapacity({
      currentUserId: 'u1',
      entries: [
        makeEntry({
          id: 'e1',
          subjectType: 'USER',
          subjectId: 'u1',
          permission: 'ADMIN',
        }),
      ],
      groupMemberships: [],
    });
    expect(snap.count).toBe(1);
    expect(snap.sources).toEqual([{ source: 'USER', entryId: 'e1' }]);
  });

  it('GROUP seul ADMIN dont current user est membre → 1 source GROUP', () => {
    const snap = computeEffectiveAdminCapacity({
      currentUserId: 'u1',
      entries: [
        makeEntry({
          id: 'e1',
          subjectType: 'GROUP',
          subjectId: 'g1',
          permission: 'ADMIN',
        }),
      ],
      groupMemberships: [
        { groupId: 'g1', memberUserIds: new Set(['u1', 'u2']) },
      ],
    });
    expect(snap.count).toBe(1);
    expect(snap.sources).toEqual([
      { source: 'GROUP', entryId: 'e1', groupId: 'g1' },
    ]);
  });

  it('USER + GROUP → 2 sources distinctes', () => {
    const snap = computeEffectiveAdminCapacity({
      currentUserId: 'u1',
      entries: [
        makeEntry({
          id: 'e1',
          subjectType: 'USER',
          subjectId: 'u1',
          permission: 'ADMIN',
        }),
        makeEntry({
          id: 'e2',
          subjectType: 'GROUP',
          subjectId: 'g1',
          permission: 'ADMIN',
        }),
      ],
      groupMemberships: [
        { groupId: 'g1', memberUserIds: new Set(['u1']) },
      ],
    });
    expect(snap.count).toBe(2);
    expect(snap.sources.map((s) => s.source).sort()).toEqual(['GROUP', 'USER']);
  });

  it('GROUP sans le current user dans ses membres → pas de source', () => {
    const snap = computeEffectiveAdminCapacity({
      currentUserId: 'u1',
      entries: [
        makeEntry({
          id: 'e1',
          subjectType: 'GROUP',
          subjectId: 'g1',
          permission: 'ADMIN',
        }),
      ],
      groupMemberships: [
        { groupId: 'g1', memberUserIds: new Set(['u2']) },
      ],
    });
    expect(snap.count).toBe(0);
    expect(snap.sources).toEqual([]);
  });

  it('GROUP sans memberships chargés → pas de source (sécurité)', () => {
    const snap = computeEffectiveAdminCapacity({
      currentUserId: 'u1',
      entries: [
        makeEntry({
          id: 'e1',
          subjectType: 'GROUP',
          subjectId: 'g1',
          permission: 'ADMIN',
        }),
      ],
      groupMemberships: [],
    });
    expect(snap.count).toBe(0);
  });

  it('entries non-ADMIN ignorées', () => {
    const snap = computeEffectiveAdminCapacity({
      currentUserId: 'u1',
      entries: [
        makeEntry({
          id: 'e1',
          subjectType: 'USER',
          subjectId: 'u1',
          permission: 'WRITE',
        }),
        makeEntry({
          id: 'e2',
          subjectType: 'USER',
          subjectId: 'u1',
          permission: 'READ',
        }),
      ],
      groupMemberships: [],
    });
    expect(snap.count).toBe(0);
  });

  it('currentUserId absent → 0 source (pas de calcul)', () => {
    const snap = computeEffectiveAdminCapacity({
      currentUserId: undefined,
      entries: [
        makeEntry({
          id: 'e1',
          subjectType: 'USER',
          subjectId: 'u1',
          permission: 'ADMIN',
        }),
      ],
      groupMemberships: [],
    });
    expect(snap.count).toBe(0);
    expect(snap.sources).toEqual([]);
  });

  it('plusieurs groupes ADMIN avec recoupement → toutes les sources comptent', () => {
    const snap = computeEffectiveAdminCapacity({
      currentUserId: 'u1',
      entries: [
        makeEntry({
          id: 'e1',
          subjectType: 'GROUP',
          subjectId: 'g1',
          permission: 'ADMIN',
        }),
        makeEntry({
          id: 'e2',
          subjectType: 'GROUP',
          subjectId: 'g2',
          permission: 'ADMIN',
        }),
      ],
      groupMemberships: [
        { groupId: 'g1', memberUserIds: new Set(['u1']) },
        { groupId: 'g2', memberUserIds: new Set(['u1', 'u3']) },
      ],
    });
    expect(snap.count).toBe(2);
  });
});

describe('wouldRemovingEntryRemoveLastAdmin', () => {
  it('seule source ADMIN (USER) → true', () => {
    const snap = {
      count: 1,
      sources: [{ source: 'USER' as const, entryId: 'e1' }],
    };
    expect(wouldRemovingEntryRemoveLastAdmin(snap, 'e1')).toBe(true);
  });

  it('seule source ADMIN (GROUP) → true', () => {
    const snap = {
      count: 1,
      sources: [{ source: 'GROUP' as const, entryId: 'e1', groupId: 'g1' }],
    };
    expect(wouldRemovingEntryRemoveLastAdmin(snap, 'e1')).toBe(true);
  });

  it('2 sources distinctes → suppression d’une seule renvoie false', () => {
    const snap = {
      count: 2,
      sources: [
        { source: 'USER' as const, entryId: 'e1' },
        { source: 'GROUP' as const, entryId: 'e2', groupId: 'g1' },
      ],
    };
    expect(wouldRemovingEntryRemoveLastAdmin(snap, 'e1')).toBe(false);
    expect(wouldRemovingEntryRemoveLastAdmin(snap, 'e2')).toBe(false);
  });

  it('entryId non listé dans les sources → false', () => {
    const snap = {
      count: 1,
      sources: [{ source: 'USER' as const, entryId: 'e1' }],
    };
    expect(wouldRemovingEntryRemoveLastAdmin(snap, 'eX')).toBe(false);
  });

  it('snapshot vide → false (rien à perdre)', () => {
    expect(
      wouldRemovingEntryRemoveLastAdmin({ count: 0, sources: [] }, 'eX'),
    ).toBe(false);
  });
});
