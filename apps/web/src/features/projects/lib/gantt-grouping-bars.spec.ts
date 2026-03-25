import { describe, expect, it } from 'vitest';
import {
  buildVisibleChildrenMap,
  computeVisibleSubtreeRollupProgress,
} from './gantt-grouping-bars';
import type { ProjectTaskApi } from '../types/project.types';

function row(
  id: string,
  overrides: Partial<ProjectTaskApi> = {},
): ProjectTaskApi {
  return {
    id,
    name: id,
    code: null,
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    progress: 0,
    plannedStartDate: null,
    plannedEndDate: null,
    actualStartDate: null,
    actualEndDate: null,
    sortOrder: 0,
    parentTaskId: null,
    dependsOnTaskId: null,
    dependencyType: null,
    ownerUserId: null,
    budgetLineId: null,
    ...overrides,
  };
}

describe('computeVisibleSubtreeRollupProgress', () => {
  it('moyenne sur parent + enfants visibles', () => {
    const tasks = [
      row('a', { progress: 50, parentTaskId: null }),
      row('b', { progress: 30, parentTaskId: 'a' }),
      row('c', { progress: 70, parentTaskId: 'a' }),
    ];
    const m = new Map(tasks.map((t) => [t.id, t]));
    const children = buildVisibleChildrenMap(
      tasks as unknown as Parameters<typeof buildVisibleChildrenMap>[0],
    );
    expect(computeVisibleSubtreeRollupProgress('a', m, children)).toBe(50);
  });

  it('retourne null si aucune entrée', () => {
    const m = new Map<string, ProjectTaskApi>();
    const children = new Map<string, string[]>();
    expect(computeVisibleSubtreeRollupProgress('x', m, children)).toBeNull();
  });
});
