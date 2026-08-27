import { describe, expect, it } from 'vitest';
import { buildRealizedVsPlannedChartRows } from './build-realized-vs-planned-chart';

describe('buildRealizedVsPlannedChartRows', () => {
  it('sans endDate : 12 mois depuis start (répartition égale)', () => {
    const rows = buildRealizedVsPlannedChartRows({
      exerciseStartDateIso: '2026-01-01T00:00:00.000Z',
      totalForecastAmount: 1200,
      monthlyTrend: [
        { month: '2026-04', committed: 100, consumed: 400 },
        { month: '2026-05', committed: 50, consumed: 200 },
      ],
    });

    expect(rows).toHaveLength(12);
    expect(rows[0]).toMatchObject({
      label: 'J',
      monthLabel: 'Jan',
      monthKey: '2026-01',
      planned: 100,
      realized: 0,
    });
    expect(rows[3]).toMatchObject({
      monthKey: '2026-04',
      planned: 100,
      realized: 400,
    });
    expect(rows.every((row) => row.planned === 100)).toBe(true);
  });

  it('préfère le planning mensuel fourni à la répartition égale', () => {
    const rows = buildRealizedVsPlannedChartRows({
      exerciseStartDateIso: '2026-01-01T00:00:00.000Z',
      totalForecastAmount: 1200,
      monthlyTrend: [],
      plannedAmounts12: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
    });

    expect(rows[0].planned).toBe(10);
    expect(rows[11].planned).toBe(120);
  });

  it('exercice juil → juin : 12 mois glissants', () => {
    const rows = buildRealizedVsPlannedChartRows({
      exerciseStartDateIso: '2026-07-01T00:00:00.000Z',
      exerciseEndDateIso: '2027-06-30T00:00:00.000Z',
      totalForecastAmount: 1200,
      monthlyTrend: [],
    });

    expect(rows).toHaveLength(12);
    expect(rows[0].monthKey).toBe('2026-07');
    expect(rows[0].monthLabel).toBe('Juil');
    expect(rows[11].monthKey).toBe('2027-06');
    expect(rows[11].monthLabel).toBe('Juin');
  });

  it('exercice 18 mois : une barre par mois civil inclusif', () => {
    const rows = buildRealizedVsPlannedChartRows({
      exerciseStartDateIso: '2026-01-01T00:00:00.000Z',
      exerciseEndDateIso: '2027-06-30T00:00:00.000Z',
      totalForecastAmount: 1800,
      monthlyTrend: [{ month: '2027-03', committed: 0, consumed: 50 }],
      plannedAmounts12: Array.from({ length: 12 }, () => 100),
    });

    expect(rows).toHaveLength(18);
    expect(rows[0].monthKey).toBe('2026-01');
    expect(rows[0].planned).toBe(100);
    expect(rows[11].planned).toBe(100);
    // mois 13+ : pas de grille planning → 1800/18
    expect(rows[12].planned).toBe(100);
    expect(rows[17].monthKey).toBe('2027-06');
    expect(rows[14].realized).toBe(50);
  });

  it('exercice court janv → fév : 2 mois', () => {
    const rows = buildRealizedVsPlannedChartRows({
      exerciseStartDateIso: '2026-01-15T00:00:00.000Z',
      exerciseEndDateIso: '2026-02-28T00:00:00.000Z',
      totalForecastAmount: 200,
      monthlyTrend: [],
    });

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.monthKey)).toEqual(['2026-01', '2026-02']);
    expect(rows.every((r) => r.planned === 100)).toBe(true);
  });
});
