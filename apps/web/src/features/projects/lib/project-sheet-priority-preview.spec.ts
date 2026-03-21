import { describe, expect, it } from 'vitest';
import {
  computeProjectSheetPriorityScorePreview,
  effectiveRiskLevelForSheetPreview,
} from './project-sheet-priority-preview';

describe('project-sheet-priority-preview', () => {
  it('calcule le même ordre de grandeur que la formule serveur (ex. RFC-PROJ-012)', () => {
    const score = computeProjectSheetPriorityScorePreview({
      businessValueScore: 4,
      strategicAlignment: 5,
      urgencyScore: 3,
      effectiveRiskLevel: 'LOW',
      roi: 0.6,
    });
    expect(score).not.toBeNull();
    expect(score).toBeGreaterThan(0);
  });

  it('retourne null si un score valeur / alignement / urgence manque', () => {
    expect(
      computeProjectSheetPriorityScorePreview({
        businessValueScore: undefined,
        strategicAlignment: 5,
        urgencyScore: 3,
        effectiveRiskLevel: null,
        roi: null,
      }),
    ).toBeNull();
  });

  it('niveau effectif : select si renseigné, sinon max des risques', () => {
    expect(
      effectiveRiskLevelForSheetPreview('MEDIUM', '__unset__', [
        { probability: 'LOW', impact: 'LOW' } as any,
      ]),
    ).toBe('MEDIUM');
    expect(
      effectiveRiskLevelForSheetPreview('__unset__', '__unset__', [
        { probability: 'HIGH', impact: 'HIGH' } as any,
      ]),
    ).toBe('HIGH');
  });
});
