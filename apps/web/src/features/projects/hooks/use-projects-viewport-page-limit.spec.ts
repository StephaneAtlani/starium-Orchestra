import { describe, expect, it } from 'vitest';
import { estimateProjectsViewportPageLimit } from './use-projects-viewport-page-limit';

describe('estimateProjectsViewportPageLimit', () => {
  it('calcule un limit borné pour une hauteur d’écran typique', () => {
    const limit = estimateProjectsViewportPageLimit({
      viewportHeight: 900,
      tableTop: 280,
    });
    expect(limit).toBeGreaterThanOrEqual(5);
    expect(limit).toBeLessThanOrEqual(40);
  });

  it('ne descend pas sous le minimum', () => {
    expect(
      estimateProjectsViewportPageLimit({
        viewportHeight: 400,
        tableTop: 350,
      }),
    ).toBe(5);
  });
});
