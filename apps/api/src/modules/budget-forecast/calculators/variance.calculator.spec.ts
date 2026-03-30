import {
  computeLineStatus,
  computeVarianceConsumed,
  computeVarianceForecast,
  normalizeLineCode,
  safeRate,
} from './variance.calculator';

describe('variance.calculator', () => {
  it('returns 0 rate when denominator is 0', () => {
    expect(safeRate(10, 0)).toBe(0);
  });

  it('computes consumed and forecast variances from revised budget', () => {
    expect(computeVarianceConsumed(100, 35)).toBe(65);
    expect(computeVarianceForecast(100, 120)).toBe(-20);
  });

  it('respects status priority CRITICAL > WARNING > OK', () => {
    expect(
      computeLineStatus({ budget: 100, consumed: 120, forecast: 150 }),
    ).toBe('CRITICAL');
    expect(
      computeLineStatus({ budget: 100, consumed: 80, forecast: 120 }),
    ).toBe('WARNING');
    expect(
      computeLineStatus({ budget: 100, consumed: 80, forecast: 95 }),
    ).toBe('OK');
  });

  it('normalizes line code with trim and uppercase', () => {
    expect(normalizeLineCode('  abc-01  ')).toBe('ABC-01');
  });
});
