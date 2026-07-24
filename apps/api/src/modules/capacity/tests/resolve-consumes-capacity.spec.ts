import {
  resolveActionPlanConsumesCapacity,
  resolveProjectConsumesCapacity,
  resolveProjectRiskConsumesCapacity,
} from '../lib/resolve-consumes-capacity';

describe('resolve-consumes-capacity (RFC-CAPA-001)', () => {
  describe('resolveProjectConsumesCapacity', () => {
    it('null + racine → true', () => {
      expect(resolveProjectConsumesCapacity(null, null)).toBe(true);
    });
    it('null + parent → false', () => {
      expect(resolveProjectConsumesCapacity(null, 'parent-1')).toBe(false);
    });
    it('override true/false', () => {
      expect(resolveProjectConsumesCapacity(true, 'parent-1')).toBe(true);
      expect(resolveProjectConsumesCapacity(false, null)).toBe(false);
    });
  });

  describe('resolveProjectRiskConsumesCapacity', () => {
    it('null hors projet → true ; lié projet → false', () => {
      expect(resolveProjectRiskConsumesCapacity(null, null)).toBe(true);
      expect(resolveProjectRiskConsumesCapacity(null, 'p1')).toBe(false);
    });
  });

  describe('resolveActionPlanConsumesCapacity', () => {
    it('null sans lien → true', () => {
      const r = resolveActionPlanConsumesCapacity(null, [
        { projectId: null, riskId: null },
      ]);
      expect(r).toEqual({ status: 'ok', consumes: true });
    });
    it('null avec lien → false', () => {
      const r = resolveActionPlanConsumesCapacity(null, [
        { projectId: 'p1', riskId: null },
      ]);
      expect(r).toEqual({ status: 'ok', consumes: false });
    });
    it('true explicite avec lien → reject', () => {
      const r = resolveActionPlanConsumesCapacity(true, [
        { projectId: null, riskId: 'r1' },
      ]);
      expect(r).toEqual({
        status: 'reject',
        reason: 'EXPLICIT_TRUE_WITH_LINKED_TASKS',
      });
    });
    it('true explicite sans lien → ok', () => {
      const r = resolveActionPlanConsumesCapacity(true, []);
      expect(r).toEqual({ status: 'ok', consumes: true });
    });
  });
});
