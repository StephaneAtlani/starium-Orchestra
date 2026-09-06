import { describe, expect, it } from 'vitest';
import { driftSemanticLabel } from './project-budget-imputation';

describe('driftSemanticLabel', () => {
  it('positif → au-dessus', () => {
    expect(driftSemanticLabel(12)).toBe('au-dessus de la cible');
  });
  it('négatif → en dessous', () => {
    expect(driftSemanticLabel(-3)).toBe('en dessous de la cible');
  });
  it('zéro → à la cible', () => {
    expect(driftSemanticLabel(0)).toBe('à la cible');
  });
});
