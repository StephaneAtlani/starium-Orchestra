import {
  remainingPlanningMonthIndexes,
  splitAmountAcrossMonths,
} from './budget-line-mid-year-planning.util';

describe('budget-line-mid-year-planning.util', () => {
  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-12-31T00:00:00.000Z');

  it('prorata août → déc : 5 mois restants (mois courant inclus)', () => {
    const ref = new Date('2026-08-15T00:00:00.000Z');
    expect(remainingPlanningMonthIndexes(start, end, ref)).toEqual([8, 9, 10, 11, 12]);
    const months = splitAmountAcrossMonths(100_000, [8, 9, 10, 11, 12]);
    expect(months.slice(0, 7).every((v) => v === 0)).toBe(true);
    expect(months.slice(7)).toEqual([20000, 20000, 20000, 20000, 20000]);
  });

  it('avant l’exercice : 12 mois', () => {
    expect(
      remainingPlanningMonthIndexes(start, end, new Date('2025-12-01T00:00:00.000Z')),
    ).toHaveLength(12);
  });

  it('après l’exercice : aucun mois', () => {
    expect(
      remainingPlanningMonthIndexes(start, end, new Date('2027-01-02T00:00:00.000Z')),
    ).toEqual([]);
  });
});
