import { describe, expect, it } from 'vitest';
import { normalizeProjectGanttPayload } from './normalize-project-gantt-payload';
import type { ProjectGanttPayload } from '../../api/projects.api';

const basePayload: ProjectGanttPayload = {
  projectId: 'p1',
  phases: [
    {
      id: 'ph1',
      name: 'Phase 1',
      sortOrder: 0,
      derivedStartDate: null,
      derivedEndDate: null,
      derivedDurationDays: null,
      derivedProgress: null,
      tasks: [
        {
          id: 't1',
          phaseId: 'ph1',
          dependsOnTaskId: null,
          dependencyType: null,
          name: 'T1',
          status: 'TODO',
          priority: 'MEDIUM',
          progress: 0,
          plannedStartDate: null,
          plannedEndDate: null,
          actualStartDate: null,
          actualEndDate: null,
          sortOrder: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
  ],
  tasks: [
    {
      id: 't1',
      phaseId: 'ph1',
      dependsOnTaskId: null,
      dependencyType: null,
      name: 'T1',
      status: 'TODO',
      priority: 'MEDIUM',
      progress: 0,
      plannedStartDate: null,
      plannedEndDate: null,
      actualStartDate: null,
      actualEndDate: null,
      sortOrder: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  ungroupedTasks: [],
  milestones: [],
};

describe('normalizeProjectGanttPayload', () => {
  it('remplit project depuis projectId si absent', () => {
    const n = normalizeProjectGanttPayload(basePayload);
    expect(n.project.id).toBe('p1');
    expect(n.project.status).toBe('UNKNOWN');
    expect(n.project.businessProblem).toBeNull();
  });

  it('force isLate à boolean', () => {
    const n = normalizeProjectGanttPayload({
      ...basePayload,
      tasks: basePayload.tasks.map((t) => ({ ...t, isLate: true })),
    });
    expect(n.tasks[0]?.isLate).toBe(true);
  });
});
