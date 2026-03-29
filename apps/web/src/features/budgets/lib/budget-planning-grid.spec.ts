import { describe, expect, it } from 'vitest';
import {
  aggregateExerciseQuarters,
  buildManualPlanningPutPayload,
  lineIdsForPilotagePage,
  pilotagePageCount,
  planningMonthsToTwelveArray,
  replaceMonthAmount,
  sumTwelveMonths,
  twelveAmountsEqual,
} from './budget-planning-grid';

describe('budget-planning-grid', () => {
  it('planningMonthsToTwelveArray maps monthIndex and fills zeros', () => {
    const m = planningMonthsToTwelveArray([
      { monthIndex: 1, amount: 10 },
      { monthIndex: 12, amount: 5 },
    ]);
    expect(m[0]).toBe(10);
    expect(m[10]).toBe(0);
    expect(m[11]).toBe(5);
  });

  it('sumTwelveMonths', () => {
    expect(sumTwelveMonths([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])).toBe(12);
  });

  it('aggregateExerciseQuarters', () => {
    const q = aggregateExerciseQuarters([
      1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4,
    ]);
    expect(q).toEqual([3, 6, 9, 12]);
  });

  it('replaceMonthAmount immutability of input', () => {
    const base = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const next = replaceMonthAmount(base, 3, 99);
    expect(base[2]).toBe(0);
    expect(next[2]).toBe(99);
  });

  it('buildManualPlanningPutPayload sends 12 months', () => {
    const amounts = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const p = buildManualPlanningPutPayload(amounts);
    expect(p.months).toHaveLength(12);
    expect(p.months[0]).toEqual({ monthIndex: 1, amount: 1 });
    expect(p.months[11]).toEqual({ monthIndex: 12, amount: 0 });
  });

  it('twelveAmountsEqual', () => {
    const a = [1, ...Array(11).fill(0)];
    const b = [1, ...Array(11).fill(0)];
    expect(twelveAmountsEqual(a, b)).toBe(true);
    expect(twelveAmountsEqual([...a], [...b, 0])).toBe(false);
  });

  it('lineIdsForPilotagePage returns all ids when under threshold', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `L${i}`);
    expect(lineIdsForPilotagePage(ids, 0)).toEqual(ids);
  });

  it('lineIdsForPilotagePage paginates beyond threshold', () => {
    const ids = Array.from({ length: 60 }, (_, i) => `L${i}`);
    const page0 = lineIdsForPilotagePage(ids, 0, 25);
    const page1 = lineIdsForPilotagePage(ids, 1, 25);
    expect(page0).toHaveLength(25);
    expect(page1[0]).toBe('L25');
    expect(pilotagePageCount(60, 25)).toBe(3);
  });
});
