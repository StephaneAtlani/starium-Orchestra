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
    // 900 - 280 - 128 - 56 - 8 = 428 / 72 ≈ 5
    expect(limit).toBe(5);
  });

  it('avec thead sticky, ignore le chrome au-dessus et remplit le scrollport', () => {
    const limit = estimateProjectsViewportPageLimit({
      viewportHeight: 900,
      tableTop: 280,
      stickyHeader: true,
    });
    // 900 - 0 - 128 - 56 - 8 = 708 / 72 ≈ 9
    expect(limit).toBe(9);
  });

  it('augmente le nombre de lignes sur grand écran / peu de chrome', () => {
    const limit = estimateProjectsViewportPageLimit({
      viewportHeight: 1080,
      tableTop: 200,
      theadHeight: 100,
      rowHeight: 70,
      footerHeight: 48,
    });
    // 1080 - 200 - 100 - 48 - 8 = 724 / 70 ≈ 10
    expect(limit).toBe(10);
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
