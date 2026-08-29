import { describe, expect, it } from 'vitest';
import { isLineIncludedInFicheTotals } from './budget-fiche-line-totals';

describe('isLineIncludedInFicheTotals', () => {
  it('exclut PENDING d’un budget VALIDATED', () => {
    expect(isLineIncludedInFicheTotals('PENDING_VALIDATION', 'VALIDATED')).toBe(false);
    expect(isLineIncludedInFicheTotals('ACTIVE', 'VALIDATED')).toBe(true);
  });

  it('inclut PENDING d’un budget DRAFT', () => {
    expect(isLineIncludedInFicheTotals('PENDING_VALIDATION', 'DRAFT')).toBe(true);
  });
});
