import { describe, expect, it } from 'vitest';
import { buildRealizedVsPlannedChartRows } from './build-realized-vs-planned-chart';

describe('buildRealizedVsPlannedChartRows', () => {
  it('retourne toujours 12 mois avec prévu réparti et réalisé par mois', () => {
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
      left: 100,
      right: 0,
    });
    expect(rows[3]).toMatchObject({
      label: 'A',
      monthLabel: 'Avr',
      monthKey: '2026-04',
      planned: 100,
      realized: 400,
    });
    expect(rows[4]).toMatchObject({
      label: 'M',
      monthLabel: 'Mai',
      monthKey: '2026-05',
      planned: 100,
      realized: 200,
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
});
