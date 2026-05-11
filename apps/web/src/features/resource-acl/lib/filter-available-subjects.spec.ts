import { describe, expect, it } from 'vitest';
import {
  alreadyAssignedIdsForSubjectType,
  filterAvailableSubjects,
  isDuplicateSubject,
} from './filter-available-subjects';
import type { ResourceAclEntry } from '../api/resource-acl.types';

function entry(
  id: string,
  subjectType: 'USER' | 'GROUP',
  subjectId: string,
): ResourceAclEntry {
  return {
    id,
    subjectType,
    subjectId,
    permission: 'READ',
    subjectLabel: subjectId,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  };
}

describe('filterAvailableSubjects', () => {
  const candidates = [
    { id: 'u1', label: 'Alice Martin', searchHint: 'alice@demo.fr' },
    { id: 'u2', label: 'Bob Durand', searchHint: 'bob@demo.fr' },
    { id: 'u3', label: 'Charlie Bouvier', searchHint: 'charlie@demo.fr' },
  ];

  it('exclut les sujets déjà assignés', () => {
    const result = filterAvailableSubjects(candidates, new Set(['u2']), '');
    expect(result.map((c) => c.id)).toEqual(['u1', 'u3']);
  });

  it('filtre par nom (insensible à la casse)', () => {
    const result = filterAvailableSubjects(candidates, new Set(), 'BOB');
    expect(result.map((c) => c.id)).toEqual(['u2']);
  });

  it('filtre par email via searchHint', () => {
    const result = filterAvailableSubjects(candidates, new Set(), 'charlie@');
    expect(result.map((c) => c.id)).toEqual(['u3']);
  });

  it('search vide → renvoie tous les sujets disponibles', () => {
    const result = filterAvailableSubjects(candidates, new Set(), '   ');
    expect(result.map((c) => c.id)).toEqual(['u1', 'u2', 'u3']);
  });
});

describe('isDuplicateSubject', () => {
  const entries: ResourceAclEntry[] = [
    entry('e1', 'USER', 'u1'),
    entry('e2', 'GROUP', 'g1'),
  ];

  it('détecte un doublon (USER, u1)', () => {
    expect(
      isDuplicateSubject({ entries, subjectType: 'USER', subjectId: 'u1' }),
    ).toBe(true);
  });

  it('même subjectId, autre subjectType → pas un doublon', () => {
    expect(
      isDuplicateSubject({ entries, subjectType: 'GROUP', subjectId: 'u1' }),
    ).toBe(false);
  });

  it('inconnu → pas un doublon', () => {
    expect(
      isDuplicateSubject({ entries, subjectType: 'USER', subjectId: 'uX' }),
    ).toBe(false);
  });
});

describe('alreadyAssignedIdsForSubjectType', () => {
  const entries: ResourceAclEntry[] = [
    entry('e1', 'USER', 'u1'),
    entry('e2', 'USER', 'u2'),
    entry('e3', 'GROUP', 'g1'),
  ];

  it('retourne uniquement les ids du subjectType demandé', () => {
    expect(alreadyAssignedIdsForSubjectType(entries, 'USER')).toEqual(
      new Set(['u1', 'u2']),
    );
    expect(alreadyAssignedIdsForSubjectType(entries, 'GROUP')).toEqual(
      new Set(['g1']),
    );
  });
});
