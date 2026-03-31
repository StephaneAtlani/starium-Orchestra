import { describe, expect, it } from 'vitest';
import { comparisonDiffClass } from './comparison-diff';

describe('comparisonDiffClass', () => {
  it('diff > 0 → vert', () => {
    expect(comparisonDiffClass(1)).toContain('emerald');
  });

  it('diff < 0 → rouge', () => {
    expect(comparisonDiffClass(-1)).toContain('red');
  });

  it('diff = 0 → pas de couleur signée', () => {
    expect(comparisonDiffClass(0)).toBe('');
  });
});
