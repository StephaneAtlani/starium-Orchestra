import { describe, expect, it } from 'vitest';
import {
  computeIndentPatch,
  computeOutdentPatch,
  computeSortOrderForParent,
  wouldPatchIntroduceCycle,
} from './project-task-indent';
import type { ProjectTaskIndentRow } from './project-task-indent';

type R = ProjectTaskIndentRow;

function row(
  id: string,
  parentTaskId: string | null,
  sortOrder: number,
  depth: number,
): R {
  return { id, parentTaskId, sortOrder, depth };
}

describe('computeIndentPatch', () => {
  it('retourne null sur la première ligne (impossible)', () => {
    const rows: R[] = [row('a', null, 0, 0)];
    expect(computeIndentPatch(rows, 'a')).toBeNull();
  });

  it('parent = id de la ligne précédente affichée', () => {
    const rows: R[] = [
      row('a', null, 0, 0),
      row('b', null, 1, 0),
    ];
    const p = computeIndentPatch(rows, 'b');
    expect(p).toEqual({ parentTaskId: 'a', sortOrder: 0 });
  });

  it('sortOrder stable : dernier enfant affiché du nouveau parent + 1', () => {
    const rows: R[] = [
      row('a', null, 0, 0),
      row('c', 'a', 0, 1),
      row('b', null, 2, 0),
    ];
    const p = computeIndentPatch(rows, 'b');
    expect(p?.parentTaskId).toBe('c');
    expect(p?.sortOrder).toBe(0);
  });
});

describe('computeOutdentPatch', () => {
  it('impossible sur racine', () => {
    const rows: R[] = [row('a', null, 0, 0)];
    expect(computeOutdentPatch(rows, 'a')).toBeNull();
  });

  it('enfant direct d’une racine => parentTaskId = null', () => {
    const rows: R[] = [
      row('a', null, 0, 0),
      row('b', 'a', 0, 1),
    ];
    const p = computeOutdentPatch(rows, 'b');
    expect(p).toEqual({ parentTaskId: null, sortOrder: 1 });
  });

  it('sous-enfant => parentTaskId = parent du parent', () => {
    const rows: R[] = [
      row('a', null, 0, 0),
      row('b', 'a', 0, 1),
      row('c', 'b', 0, 2),
    ];
    const p = computeOutdentPatch(rows, 'c');
    expect(p).toEqual({ parentTaskId: 'a', sortOrder: 1 });
  });

  it('retourne null si la ligne parent est absente de la liste affichée', () => {
    const rows: R[] = [
      row('c', 'missing-parent', 0, 2),
    ];
    expect(computeOutdentPatch(rows, 'c')).toBeNull();
  });
});

describe('sortOrder après indent / outdent', () => {
  it('cohérent après indent (M+1 explicite quand frères affichés sous le nouveau parent)', () => {
    const rows: R[] = [
      row('a', null, 0, 0),
      row('x', 'a', 5, 1),
      row('y', 'a', 7, 1),
      row('z', 'y', 7, 2),
      row('b', null, 1, 0),
    ];
    const p = computeIndentPatch(rows, 'b');
    expect(p?.parentTaskId).toBe('z');
    expect(p?.sortOrder).toBe(0);
  });

  it('M+1 = max frères affichés + 1 sous un parent cible (formule explicite)', () => {
    const rows: R[] = [
      row('a', null, 0, 0),
      row('y', 'a', 7, 1),
      row('z', 'y', 7, 2),
    ];
    expect(computeSortOrderForParent(rows, 'b', 'y')).toBe(8);
  });

  it('cohérent après outdent au niveau racines', () => {
    const rows: R[] = [
      row('a', null, 0, 0),
      row('r1', null, 3, 0),
      row('b', 'a', 0, 1),
    ];
    const p = computeOutdentPatch(rows, 'b');
    expect(p?.parentTaskId).toBeNull();
    expect(p?.sortOrder).toBe(4);
  });
});

describe('liste filtrée affichée (pas arbre complet)', () => {
  it('l’indent utilise la ligne précédente du sous-ensemble, pas un ordre global', () => {
    const filtered: R[] = [
      row('b', null, 0, 0),
      row('c', null, 1, 0),
    ];
    const p = computeIndentPatch(filtered, 'c');
    expect(p?.parentTaskId).toBe('b');
  });
});

describe('wouldPatchIntroduceCycle', () => {
  it('détecte parent = soi', () => {
    const m = new Map([
      ['a', { id: 'a', parentTaskId: null, sortOrder: 0, depth: 0 }],
    ]);
    expect(wouldPatchIntroduceCycle('a', 'a', m)).toBe(true);
  });

  it('pas de cycle pour parent valide', () => {
    const m = new Map([
      ['a', { id: 'a', parentTaskId: null, sortOrder: 0, depth: 0 }],
      ['b', { id: 'b', parentTaskId: 'a', sortOrder: 0, depth: 1 }],
    ]);
    expect(wouldPatchIntroduceCycle('x', 'b', m)).toBe(false);
  });
});

describe('computeSortOrderForParent', () => {
  it('exclut la tâche déplacée du max des frères', () => {
    const rows: R[] = [
      row('a', null, 0, 0),
      row('b', 'a', 5, 1),
    ];
    expect(computeSortOrderForParent(rows, 'b', 'a')).toBe(0);
  });
});
