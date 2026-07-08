import { describe, expect, it } from 'vitest';
import {
  axisObjectiveTrajectoryCounts,
  countAxesOnTrack,
  formatVisionReviewDate,
  paginateOverviewItems,
} from './strategic-overview-view';
import {
  STRATEGIC_OVERVIEW_DONUT_STROKE,
  STRATEGIC_OVERVIEW_GOLD_ICON,
  getAxisTheme,
} from './strategic-overview-theme';
import type { StrategicAxisDto } from '../types/strategic-vision.types';

function makeAxis(
  objectives: StrategicAxisDto['objectives'],
  overrides: Partial<StrategicAxisDto> = {},
): StrategicAxisDto {
  return {
    id: 'axis-1',
    clientId: 'c1',
    visionId: 'v1',
    name: '[icon:trendingUp;color:green] Performance',
    description: 'Desc',
    orderIndex: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    objectives,
    ...overrides,
  };
}

describe('strategic-overview-view', () => {
  it('compte les objectifs en trajectoire', () => {
    const axis = makeAxis([
      {
        id: 'o1',
        clientId: 'c1',
        axisId: 'axis-1',
        title: 'A',
        description: null,
        ownerLabel: null,
        directionId: null,
        direction: null,
        status: 'ON_TRACK',
        deadline: null,
        createdAt: '',
        updatedAt: '',
        links: [],
      },
      {
        id: 'o2',
        clientId: 'c1',
        axisId: 'axis-1',
        title: 'B',
        description: null,
        ownerLabel: null,
        directionId: null,
        direction: null,
        status: 'OFF_TRACK',
        deadline: null,
        createdAt: '',
        updatedAt: '',
        links: [],
      },
    ]);

    expect(axisObjectiveTrajectoryCounts(axis)).toEqual({ onTrajectory: 1, total: 2 });
  });

  it('compte les axes en bonne trajectoire', () => {
    const axes = [
      makeAxis([
        {
          id: 'o1',
          clientId: 'c1',
          axisId: 'axis-1',
          title: 'A',
          description: null,
          ownerLabel: null,
          directionId: null,
          direction: null,
          status: 'ON_TRACK',
          deadline: null,
          createdAt: '',
          updatedAt: '',
          links: [],
        },
      ]),
      makeAxis(
        [
          {
            id: 'o2',
            clientId: 'c1',
            axisId: 'axis-2',
            title: 'B',
            description: null,
            ownerLabel: null,
            directionId: null,
            direction: null,
            status: 'OFF_TRACK',
            deadline: null,
            createdAt: '',
            updatedAt: '',
            links: [],
          },
        ],
        { id: 'axis-2' },
      ),
    ];

    expect(countAxesOnTrack(axes)).toBe(1);
  });

  it('formate une date de revue en français', () => {
    expect(formatVisionReviewDate('2025-05-02T12:00:00.000Z')).toMatch(/mai 2025/);
  });

  it('paginate les listes overview', () => {
    const items = Array.from({ length: 8 }, (_, index) => index);
    const page1 = paginateOverviewItems(items, 1, 6);
    const page2 = paginateOverviewItems(items, 2, 6);

    expect(page1.pageItems).toHaveLength(6);
    expect(page2.pageItems).toHaveLength(2);
    expect(page2.safePage).toBe(2);
  });
});

describe('strategic-overview-theme', () => {
  it('expose une palette KPI or et un donut teal', () => {
    expect(STRATEGIC_OVERVIEW_GOLD_ICON).toContain('--brand-gold');
    expect(STRATEGIC_OVERVIEW_DONUT_STROKE).toBe('var(--teal)');
  });

  it('cycle les thèmes d’axes vert / bleu / ambre / violet', () => {
    expect(getAxisTheme('auto', 0).barClass).toContain('--state-success');
    expect(getAxisTheme('auto', 1).barClass).toContain('--state-info');
    expect(getAxisTheme('auto', 2).barClass).toContain('--state-warning');
    expect(getAxisTheme('auto', 3).barClass).toContain('--purple');
  });
});
