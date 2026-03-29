import { describe, expect, it } from 'vitest';
import { getBudgetPilotageMonthColumnLabels } from './budget-exercise-month-labels';

describe('budget-exercise-month-labels', () => {
  it('returns 12 labels rotated from exercise start (UTC)', () => {
    const labels = getBudgetPilotageMonthColumnLabels('2025-04-01T00:00:00.000Z');
    expect(labels).toHaveLength(12);
    expect(labels[0]).toBe('Avr');
    expect(labels[11]).toBe('Mar');
  });

  it('throws on invalid date', () => {
    expect(() => getBudgetPilotageMonthColumnLabels('')).toThrow(RangeError);
  });
});
