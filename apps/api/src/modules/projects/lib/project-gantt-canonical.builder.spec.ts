import { ProjectMilestoneStatus, ProjectTaskStatus } from '@prisma/client';
import { buildCanonicalGanttPayload } from './project-gantt-canonical.builder';

describe('buildCanonicalGanttPayload', () => {
  const project = {
    id: 'proj',
    name: 'Projet',
    status: 'DRAFT',
    startDate: null,
    targetEndDate: null,
  };

  it('ne duplique pas les tâches entre phases et ungrouped', () => {
    const phases = [
      {
        id: 'ph1',
        name: 'P1',
        sortOrder: 0,
        clientId: 'c',
        projectId: 'proj',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const tasks = [
      {
        id: 't1',
        clientId: 'c',
        projectId: 'proj',
        phaseId: 'ph1',
        dependsOnTaskId: null,
        dependencyType: null,
        name: 'T1',
        status: ProjectTaskStatus.TODO,
        priority: 'MEDIUM' as const,
        progress: 0,
        plannedStartDate: new Date('2026-01-01'),
        plannedEndDate: new Date('2026-01-02'),
        actualStartDate: null,
        actualEndDate: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        code: null,
        description: null,
        ownerUserId: null,
      },
    ] as any;
    const milestones: any[] = [];

    const canon = buildCanonicalGanttPayload(project, phases, tasks, milestones);
    const inPhase = canon.phases[0]?.tasks ?? [];
    expect(inPhase).toHaveLength(1);
    expect(canon.ungroupedTasks).toHaveLength(0);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
  });

  it('expose isLate sur tâches et jalons', () => {
    const phases: any[] = [];
    const tasks = [
      {
        id: 'late',
        clientId: 'c',
        projectId: 'proj',
        phaseId: null,
        dependsOnTaskId: null,
        dependencyType: null,
        name: 'Late',
        status: ProjectTaskStatus.TODO,
        priority: 'MEDIUM',
        progress: 0,
        plannedStartDate: new Date('2020-01-01'),
        plannedEndDate: new Date('2020-01-02'),
        actualStartDate: null,
        actualEndDate: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        code: null,
        description: null,
        ownerUserId: null,
      },
    ];
    const milestones = [
      {
        id: 'm1',
        clientId: 'c',
        projectId: 'proj',
        name: 'M',
        code: null,
        description: null,
        targetDate: new Date('2020-06-01'),
        achievedDate: null,
        status: ProjectMilestoneStatus.PLANNED,
        linkedTaskId: null,
        phaseId: null,
        ownerUserId: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const now = new Date('2026-01-01T12:00:00.000Z');
    const canon = buildCanonicalGanttPayload(project, phases, tasks, milestones, now);
    expect(canon.ungroupedTasks[0]?.isLate).toBe(true);
    expect(canon.milestones[0]?.isLate).toBe(true);
  });
});
