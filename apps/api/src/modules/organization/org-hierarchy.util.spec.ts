import { buildOrgUnitTree, wouldSetParentCreateCycle } from './org-hierarchy.util';

describe('org-hierarchy.util', () => {
  describe('wouldSetParentCreateCycle', () => {
    it('returns false when newParentId is null', () => {
      expect(
        wouldSetParentCreateCycle({
          unitId: 'a',
          newParentId: null,
          parentById: new Map([['b', 'a']]),
        }),
      ).toBe(false);
    });

    it('detects direct cycle', () => {
      const parentById = new Map<string, string | null>([
        ['u1', 'p1'],
        ['p1', null],
      ]);
      expect(
        wouldSetParentCreateCycle({
          unitId: 'u1',
          newParentId: 'u1',
          parentById,
        }),
      ).toBe(true);
    });

    it('detects indirect cycle', () => {
      const parentById = new Map<string, string | null>([
        ['c', 'b'],
        ['b', 'a'],
        ['a', null],
      ]);
      expect(
        wouldSetParentCreateCycle({
          unitId: 'a',
          newParentId: 'c',
          parentById,
        }),
      ).toBe(true);
    });
  });

  describe('buildOrgUnitTree', () => {
    it('nests children and sorts by sortOrder then name', () => {
      const flat = [
        { id: '2', parentId: '1', sortOrder: 0, name: 'B', type: 'TEAM', status: 'ACTIVE' },
        { id: '1', parentId: null, sortOrder: 0, name: 'A', type: 'DIRECTION', status: 'ACTIVE' },
        { id: '3', parentId: '1', sortOrder: 1, name: 'C', type: 'TEAM', status: 'ACTIVE' },
      ] as const;
      const tree = buildOrgUnitTree([...flat]);
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('1');
      expect(tree[0].children.map((c) => c.id)).toEqual(['2', '3']);
    });
  });
});
