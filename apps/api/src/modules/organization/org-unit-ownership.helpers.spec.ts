import {
  listOrgUnitOwnershipArchiveBlockers,
  resolveEffectiveOwnerOrgUnitId,
  resolveOwnerOrgUnitSource,
} from './org-unit-ownership.helpers';

describe('org-unit-ownership.helpers', () => {
  describe('resolveEffectiveOwnerOrgUnitId', () => {
    it('uses line override when set', () => {
      expect(resolveEffectiveOwnerOrgUnitId('line-1', 'budget-1')).toBe('line-1');
    });
    it('falls back to budget when line null', () => {
      expect(resolveEffectiveOwnerOrgUnitId(null, 'budget-1')).toBe('budget-1');
    });
    it('returns null when both unset', () => {
      expect(resolveEffectiveOwnerOrgUnitId(null, null)).toBeNull();
    });
  });

  describe('resolveOwnerOrgUnitSource', () => {
    it('line when override', () => {
      expect(resolveOwnerOrgUnitSource('x', 'y')).toBe('line');
    });
    it('budget when inherited', () => {
      expect(resolveOwnerOrgUnitSource(null, 'y')).toBe('budget');
    });
    it('null when no owner', () => {
      expect(resolveOwnerOrgUnitSource(null, null)).toBeNull();
    });
  });

  describe('listOrgUnitOwnershipArchiveBlockers', () => {
    it('aggregates types with positive counts', async () => {
      const prisma = {
        project: { count: jest.fn().mockResolvedValue(1) },
        budget: { count: jest.fn().mockResolvedValue(0) },
        budgetLine: { count: jest.fn().mockResolvedValue(2) },
        supplier: { count: jest.fn().mockResolvedValue(0) },
        supplierContract: { count: jest.fn().mockResolvedValue(0) },
        strategicObjective: { count: jest.fn().mockResolvedValue(1) },
      } as any;

      const r = await listOrgUnitOwnershipArchiveBlockers(prisma, 'c1', 'ou1');
      expect(r.sort()).toEqual(['BudgetLine', 'Project', 'StrategicObjective'].sort());
    });

    it('returns empty when no active owners', async () => {
      const prisma = {
        project: { count: jest.fn().mockResolvedValue(0) },
        budget: { count: jest.fn().mockResolvedValue(0) },
        budgetLine: { count: jest.fn().mockResolvedValue(0) },
        supplier: { count: jest.fn().mockResolvedValue(0) },
        supplierContract: { count: jest.fn().mockResolvedValue(0) },
        strategicObjective: { count: jest.fn().mockResolvedValue(0) },
      } as any;

      await expect(listOrgUnitOwnershipArchiveBlockers(prisma, 'c1', 'ou1')).resolves.toEqual([]);
    });
  });
});
