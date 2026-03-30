import { describe, expect, it } from 'vitest';
import { normalizeProjectGanttPayload } from './normalize-project-gantt-payload';
import { mapProjectGanttPayloadToRenderModel } from './project-gantt-render-mapper';
import type { ProjectGanttPayload } from '../../api/projects.api';

function samplePayload(): ProjectGanttPayload {
  return {
    projectId: 'proj',
    project: {
      id: 'proj',
      name: 'P',
      status: 'ACTIVE',
      plannedStartDate: null,
      plannedEndDate: null,
    },
    phases: [
      {
        id: 'a',
        name: 'A',
        sortOrder: 1,
        derivedStartDate: null,
        derivedEndDate: null,
        derivedDurationDays: null,
        derivedProgress: null,
        tasks: [
          {
            id: 't2',
            phaseId: 'a',
            dependsOnTaskId: null,
            dependencyType: null,
            name: 'T2',
            status: 'TODO',
            priority: 'MEDIUM',
            progress: 0,
            plannedStartDate: '2026-06-01T12:00:00.000Z',
            plannedEndDate: '2026-06-10T12:00:00.000Z',
            actualStartDate: null,
            actualEndDate: null,
            sortOrder: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      {
        id: 'b',
        name: 'B',
        sortOrder: 0,
        derivedStartDate: null,
        derivedEndDate: null,
        derivedDurationDays: null,
        derivedProgress: null,
        tasks: [
          {
            id: 't1',
            phaseId: 'b',
            dependsOnTaskId: null,
            dependencyType: null,
            name: 'T1',
            status: 'TODO',
            priority: 'MEDIUM',
            progress: 0,
            plannedStartDate: '2026-05-01T12:00:00.000Z',
            plannedEndDate: '2026-05-05T12:00:00.000Z',
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
        phaseId: 'b',
        dependsOnTaskId: null,
        dependencyType: null,
        name: 'T1',
        status: 'TODO',
        priority: 'MEDIUM',
        progress: 0,
        plannedStartDate: '2026-05-01T12:00:00.000Z',
        plannedEndDate: '2026-05-05T12:00:00.000Z',
        actualStartDate: null,
        actualEndDate: null,
        sortOrder: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 't2',
        phaseId: 'a',
        dependsOnTaskId: null,
        dependencyType: null,
        name: 'T2',
        status: 'TODO',
        priority: 'MEDIUM',
        progress: 0,
        plannedStartDate: '2026-06-01T12:00:00.000Z',
        plannedEndDate: '2026-06-10T12:00:00.000Z',
        actualStartDate: null,
        actualEndDate: null,
        sortOrder: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    ungroupedTasks: [],
    milestones: [
      {
        id: 'm1',
        name: 'M',
        status: 'PLANNED',
        targetDate: '2026-07-01T12:00:00.000Z',
        linkedTaskId: null,
        phaseId: null,
        sortOrder: 0,
        isLate: false,
      },
    ],
  };
}

describe('mapProjectGanttPayloadToRenderModel', () => {
  it('produit un rendu déterministe pour le même payload normalisé', () => {
    const raw = samplePayload();
    const n = normalizeProjectGanttPayload(raw);
    const a = mapProjectGanttPayloadToRenderModel(n, {
      taskStatusFilter: 'all',
      showMilestones: true,
    });
    const b = mapProjectGanttPayloadToRenderModel(n, {
      taskStatusFilter: 'all',
      showMilestones: true,
    });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('masque les jalons si showMilestones false', () => {
    const n = normalizeProjectGanttPayload(samplePayload());
    const m = mapProjectGanttPayloadToRenderModel(n, {
      taskStatusFilter: 'all',
      showMilestones: false,
    });
    expect(m.milestonesForBody).toHaveLength(0);
  });
});
