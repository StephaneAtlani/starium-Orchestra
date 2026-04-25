import { describe, expect, it } from 'vitest';
import {
  buildStrategicDriftIndicator,
  formatObjectivesAtRisk,
} from './strategic-kpi-cards';
import type { StrategicVisionKpisResponseDto } from '../types/strategic-vision.types';

function makeKpis(
  overrides: Partial<StrategicVisionKpisResponseDto> = {},
): StrategicVisionKpisResponseDto {
  return {
    projectAlignmentRate: 0.8,
    unalignedProjectsCount: 2,
    objectivesAtRiskCount: 1,
    objectivesOffTrackCount: 1,
    overdueObjectivesCount: 1,
    generatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('strategic-kpi-cards helpers', () => {
  it('compose Objectives at Risk avec AT_RISK + OFF_TRACK', () => {
    expect(formatObjectivesAtRisk(makeKpis({ objectivesAtRiskCount: 2, objectivesOffTrackCount: 3 }))).toBe(
      5,
    );
  });

  it('calcule Strategic Drift comme indicateur visuel base sur KPI existants', () => {
    const low = buildStrategicDriftIndicator(
      makeKpis({
        projectAlignmentRate: 0.98,
        objectivesAtRiskCount: 0,
        objectivesOffTrackCount: 0,
        overdueObjectivesCount: 0,
      }),
    );
    const high = buildStrategicDriftIndicator(
      makeKpis({
        projectAlignmentRate: 0.2,
        objectivesAtRiskCount: 4,
        objectivesOffTrackCount: 4,
        overdueObjectivesCount: 4,
      }),
    );

    expect(low.level).toBe('Low');
    expect(high.level).toBe('High');
    expect(high.visualScore).toBeGreaterThan(low.visualScore);
  });
});
