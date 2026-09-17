import { describe, expect, it } from 'vitest';
import { buildStatusSlices } from '../lib/compliance-framework-ui';

describe('buildStatusSlices', () => {
  it('expose les 5 tranches avec counts API', () => {
    const slices = buildStatusSlices({
      compliantCount: 2,
      partiallyCompliantCount: 1,
      nonCompliantCount: 3,
      notAssessedCount: 4,
      notApplicableCount: 0,
    });
    expect(slices).toHaveLength(5);
    expect(slices.find((s) => s.key === 'NON_COMPLIANT')?.count).toBe(3);
    expect(slices.find((s) => s.key === 'COMPLIANT')?.label).toBe('Conforme');
  });
});
