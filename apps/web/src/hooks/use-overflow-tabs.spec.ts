import { describe, expect, it } from 'vitest';
import { computeVisibleTabCount, sumWithGaps } from '@/hooks/use-overflow-tabs';

describe('computeVisibleTabCount', () => {
  it('montre tout si la largeur suffit', () => {
    const widths = [80, 90, 100, 110, 120];
    const gap = 4;
    const total = sumWithGaps(widths, gap);
    expect(
      computeVisibleTabCount({
        widths,
        available: total + 50,
        gapPx: gap,
        moreW: 44,
      }),
    ).toBe(5);
  });

  it('n’affiche le burger que si nécessaire', () => {
    // 7 × 100 + 6 × 4 = 724 ; + burger 44 + gap = 772
    const widths = Array.from({ length: 12 }, () => 100);
    const gap = 4;
    const available = 980;
    const count = computeVisibleTabCount({
      widths,
      available,
      gapPx: gap,
      moreW: 44,
    });
    // tout : 12*100 + 11*4 = 1244 > 980 → overflow
    // avec burger : n*100 + (n)*4 + 44 <= 980 → n*104 + 44 <= 980 → n*104 <= 936 → n <= 9
    expect(count).toBeGreaterThanOrEqual(8);
    expect(count).toBeLessThan(12);
    expect(count).toBe(9);
  });

  it('ne collapse pas à 7 onglets quand ~980px restent disponibles', () => {
    // Simulation libellés projet typiques (px)
    const widths = [
      90, 110, 80, 95, 90, 85, 95, 110, 120, 150, 100, 90,
    ];
    const gap = 4;
    const available = 960;
    const count = computeVisibleTabCount({
      widths,
      available,
      gapPx: gap,
      moreW: 44,
    });
    expect(count).toBeGreaterThan(7);
  });
});
