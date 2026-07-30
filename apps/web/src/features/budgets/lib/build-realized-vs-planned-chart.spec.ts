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
    expect(rows[0]).toEqual({ label: 'J', left: 100, right: 0 });
    expect(rows[3]).toEqual({ label: 'A', left: 100, right: 400 });
    expect(rows[4]).toEqual({ label: 'M', left: 100, right: 200 });
    expect(rows.every((row) => row.left === 100)).toBe(true);
  });

  it('préfère le planning mensuel fourni à la répartition égale', () => {
    const rows = buildRealizedVsPlannedChartRows({
      exerciseStartDateIso: '2026-01-01T00:00:00.000Z',
      totalForecastAmount: 1200,
      monthlyTrend: [],
      plannedAmounts12: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
    });

    expect(rows[0].left).toBe(10);
    expect(rows[11].left).toBe(120);
  });
});
