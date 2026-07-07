import {
  MAX_PROJECT_HIERARCHY_DEPTH,
  buildAncestorChain,
  buildChildrenByParentId,
  collectDescendantIds,
  computeDepthFromRoot,
  computeSubtreeHeight,
  wouldExceedMaxDepthAfterReparent,
  wouldSetParentCreateCycle,
  type ProjectParentSummary,
} from './project-hierarchy.util';

function parentMap(entries: [string, string | null][]): Map<string, string | null> {
  return new Map(entries);
}

function summary(id: string, code: string, name = code): ProjectParentSummary {
  return { id, name, code, status: 'IN_PROGRESS', kind: 'PROJECT' };
}

describe('project-hierarchy.util', () => {
  describe('wouldSetParentCreateCycle', () => {
    it('detecte un cycle direct', () => {
      const parentById = parentMap([
        ['a', null],
        ['b', 'a'],
        ['c', 'b'],
      ]);
      expect(
        wouldSetParentCreateCycle({
          projectId: 'b',
          newParentId: 'c',
          parentById,
        }),
      ).toBe(true);
    });

    it('pas de cycle si parent racine', () => {
      const parentById = parentMap([
        ['a', null],
        ['b', 'a'],
      ]);
      expect(
        wouldSetParentCreateCycle({
          projectId: 'c',
          newParentId: 'a',
          parentById,
        }),
      ).toBe(false);
    });
  });

  describe('computeSubtreeHeight', () => {
    it('feuille = 1', () => {
      const parentById = parentMap([['a', null]]);
      const children = buildChildrenByParentId(parentById);
      expect(computeSubtreeHeight('a', children)).toBe(1);
    });

    it('chaine de 3 niveaux', () => {
      const parentById = parentMap([
        ['a', null],
        ['b', 'a'],
        ['c', 'b'],
      ]);
      const children = buildChildrenByParentId(parentById);
      expect(computeSubtreeHeight('a', children)).toBe(3);
    });

    it('arbre large — hauteur max branche', () => {
      const parentById = parentMap([
        ['root', null],
        ['b1', 'root'],
        ['b2', 'root'],
        ['leaf', 'b1'],
      ]);
      const children = buildChildrenByParentId(parentById);
      expect(computeSubtreeHeight('root', children)).toBe(3);
    });
  });

  describe('wouldExceedMaxDepthAfterReparent', () => {
    it('update refuse si sous-arbre trop profond', () => {
      const parentById = parentMap([
        ['root', null],
        ['a', 'root'],
        ['b', 'a'],
        ['c', 'b'],
        ['target', 'c'],
        ['e', 'target'],
        ['f', 'target'],
      ]);
      const children = buildChildrenByParentId(parentById);
      expect(
        wouldExceedMaxDepthAfterReparent({
          newParentId: 'c',
          projectId: 'target',
          parentById,
          childrenByParentId: children,
          isCreate: false,
        }),
      ).toBe(true);
    });

    it('create autorise si parent depth + 1 <= MAX', () => {
      const parentById = parentMap([
        ['p1', null],
        ['p2', 'p1'],
        ['p3', 'p2'],
        ['p4', 'p3'],
      ]);
      const children = buildChildrenByParentId(parentById);
      expect(
        wouldExceedMaxDepthAfterReparent({
          newParentId: 'p4',
          projectId: 'new',
          parentById,
          childrenByParentId: children,
          isCreate: true,
        }),
      ).toBe(false);
    });
  });

  describe('collectDescendantIds', () => {
    it('collecte tous les descendants', () => {
      const parentById = parentMap([
        ['a', null],
        ['b', 'a'],
        ['c', 'a'],
        ['d', 'b'],
      ]);
      const children = buildChildrenByParentId(parentById);
      expect(collectDescendantIds('a', children)).toEqual(new Set(['b', 'c', 'd']));
    });
  });

  describe('buildAncestorChain', () => {
    it('ordonne racine → parent direct', () => {
      const parentById = parentMap([
        ['root', null],
        ['mid', 'root'],
        ['leaf', 'mid'],
      ]);
      const summaryById = new Map([
        ['root', summary('root', 'R', 'Root')],
        ['mid', summary('mid', 'M', 'Mid')],
      ]);
      expect(buildAncestorChain('leaf', parentById, summaryById)).toEqual([
        summary('root', 'R', 'Root'),
        summary('mid', 'M', 'Mid'),
      ]);
    });

    it('base incohérente — cycle : chaine partielle + warn, pas de throw', () => {
      const parentById = parentMap([
        ['a', 'b'],
        ['b', 'a'],
        ['c', 'a'],
      ]);
      const summaryById = new Map([
        ['a', summary('a', 'A')],
        ['b', summary('b', 'B')],
      ]);
      const warn = jest.fn();
      const chain = buildAncestorChain('c', parentById, summaryById, warn);
      expect(chain.length).toBeGreaterThan(0);
      expect(warn).toHaveBeenCalled();
    });

    it('respecte MAX_PROJECT_HIERARCHY_DEPTH', () => {
      const entries: [string, string | null][] = [];
      for (let i = 0; i <= MAX_PROJECT_HIERARCHY_DEPTH + 2; i++) {
        entries.push([`p${i}`, i === 0 ? null : `p${i - 1}`]);
      }
      const parentById = parentMap(entries);
      const leaf = `p${MAX_PROJECT_HIERARCHY_DEPTH + 2}`;
      parentById.set(leaf, `p${MAX_PROJECT_HIERARCHY_DEPTH + 1}`);
      const summaryById = new Map<string, ProjectParentSummary>();
      for (const [id] of parentById) {
        if (id === leaf) continue;
        summaryById.set(id, summary(id, id));
      }
      const warn = jest.fn();
      const chain = buildAncestorChain(leaf, parentById, summaryById, warn);
      expect(chain.length).toBeLessThanOrEqual(MAX_PROJECT_HIERARCHY_DEPTH);
      expect(warn).toHaveBeenCalled();
    });
  });

  describe('computeDepthFromRoot', () => {
    it('racine depth 1', () => {
      expect(computeDepthFromRoot('a', parentMap([['a', null]]))).toBe(1);
    });

    it('enfant depth 2', () => {
      expect(
        computeDepthFromRoot('b', parentMap([
          ['a', null],
          ['b', 'a'],
        ])),
      ).toBe(2);
    });
  });
});
