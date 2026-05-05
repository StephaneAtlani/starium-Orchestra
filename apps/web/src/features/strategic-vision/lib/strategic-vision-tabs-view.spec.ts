import { describe, expect, it } from 'vitest';
import type { StrategicObjectiveDto } from '../types/strategic-vision.types';
import {
  buildCriticalObjectives,
  buildObjectiveStatusCounts,
  buildObjectivesByAxis,
  isObjectiveOverdue,
  isUuidLike,
} from './strategic-vision-tabs-view';

function makeObjective(
  id: string,
  overrides: Partial<StrategicObjectiveDto> = {},
): StrategicObjectiveDto {
  const { directionId, direction, ...restOverrides } = overrides;
  return {
    id,
    clientId: 'c1',
    axisId: 'axis-1',
    title: 'Objectif test',
    description: null,
    ownerLabel: 'DSI',
    status: 'ON_TRACK',
    deadline: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    links: [],
    ...restOverrides,
    directionId: directionId ?? null,
    direction: direction ?? null,
  };
}

describe('strategic-vision-tabs-view', () => {
  it('détecte les UUID bruts pour éviter leur affichage', () => {
    expect(isUuidLike('7f5f6b72-5dd0-4e26-a18f-95bc74f176f3')).toBe(true);
    expect(isUuidLike('Axe Infrastructure')).toBe(false);
    expect(isUuidLike('axis-1')).toBe(false);
  });

  it('calcule correctement les objectifs en retard (hors COMPLETED/ARCHIVED)', () => {
    const now = new Date('2026-05-01T00:00:00.000Z');
    const overdue = makeObjective('o1', {
      deadline: '2026-04-10T00:00:00.000Z',
      status: 'AT_RISK',
    });
    const done = makeObjective('o2', {
      deadline: '2026-04-10T00:00:00.000Z',
      status: 'COMPLETED',
    });

    expect(isObjectiveOverdue(overdue, now)).toBe(true);
    expect(isObjectiveOverdue(done, now)).toBe(false);
  });

  it('filtre les objectifs critiques sur statut et retard', () => {
    const now = new Date('2026-05-01T00:00:00.000Z');
    const items = [
      makeObjective('on-track'),
      makeObjective('at-risk', { status: 'AT_RISK' }),
      makeObjective('off-track', { status: 'OFF_TRACK' }),
      makeObjective('overdue', {
        status: 'ON_TRACK',
        deadline: '2026-04-10T00:00:00.000Z',
      }),
      makeObjective('archived-overdue', {
        status: 'ARCHIVED',
        deadline: '2026-04-10T00:00:00.000Z',
      }),
    ];

    const critical = buildCriticalObjectives(items, now);
    expect(critical.map((objective) => objective.id).sort()).toEqual(
      ['at-risk', 'off-track', 'overdue'].sort(),
    );
  });

  it('groupe les objectifs par axe et compte les statuts', () => {
    const objectives = [
      makeObjective('o1', { axisId: 'a1', status: 'ON_TRACK' }),
      makeObjective('o2', { axisId: 'a1', status: 'AT_RISK' }),
      makeObjective('o3', { axisId: 'a2', status: 'OFF_TRACK' }),
    ];

    const grouped = buildObjectivesByAxis(objectives);
    const statusCounts = buildObjectiveStatusCounts(objectives);

    expect(grouped.get('a1')?.length).toBe(2);
    expect(grouped.get('a2')?.length).toBe(1);
    expect(statusCounts.ON_TRACK).toBe(1);
    expect(statusCounts.AT_RISK).toBe(1);
    expect(statusCounts.OFF_TRACK).toBe(1);
  });
});
