import { describe, expect, it } from 'vitest';
import {
  aggregateMonthsToQuarters,
  amounts12FromPlanningMonths,
  buildManualPlanningPutPayload,
  replaceMonthAmount,
  sumAmounts12,
} from './budget-planning-grid';

describe('budget-planning-grid', () => {
  it('amounts12FromPlanningMonths remplit 12 slots', () => {
    const a = amounts12FromPlanningMonths([
      { monthIndex: 1, amount: 10 },
      { monthIndex: 12, amount: 5 },
    ]);
    expect(a[0]).toBe(10);
    expect(a[11]).toBe(5);
    expect(a[5]).toBe(0);
    expect(a.length).toBe(12);
  });

  it('aggregateMonthsToQuarters somme par trimestre', () => {
    const m = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4];
    expect(aggregateMonthsToQuarters(m)).toEqual([3, 6, 9, 12]);
  });

  it('sumAmounts12', () => {
    expect(sumAmounts12([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(1);
  });

  it('buildManualPlanningPutPayload produit 12 entrées ordonnées', () => {
    const amounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100] as const;
    const p = buildManualPlanningPutPayload(amounts);
    expect(p.months).toHaveLength(12);
    expect(p.months[11]).toEqual({ monthIndex: 12, amount: 100 });
    expect(p.months[0]).toEqual({ monthIndex: 1, amount: 0 });
  });

  it('replaceMonthAmount ne change qu’un mois', () => {
    const base = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as const;
    const n = replaceMonthAmount(base, 3, 42);
    expect(n[3]).toBe(42);
    expect(n[0]).toBe(0);
  });
});
