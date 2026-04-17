import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProjectScenarioStatus } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectScenarioTasksService } from './project-scenario-tasks.service';

describe('ProjectScenarioTasksService', () => {
  let service: ProjectScenarioTasksService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };

  const clientId = 'client-1';
  const projectId = 'project-1';
  const scenarioId = 'scenario-1';

  beforeEach(() => {
    prisma = {
      projectScenario: { findFirst: jest.fn() },
      projectScenarioTask: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      projectTask: { findMany: jest.fn() },
      projectMilestone: { findMany: jest.fn() },
      $transaction: jest.fn(async (input: unknown) => {
        if (typeof input === 'function') return input(prisma);
        return Promise.all(input as Promise<unknown>[]);
      }),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectScenarioTasksService(prisma, auditLogs as unknown as AuditLogsService);
    prisma.projectScenario.findFirst.mockResolvedValue({
      id: scenarioId,
      status: ProjectScenarioStatus.DRAFT,
    });
  });

  it('refuse une date invalide (endDate < startDate)', async () => {
    await expect(
      service.create(clientId, projectId, scenarioId, {
        title: 'Task A',
        startDate: new Date('2026-05-10T00:00:00.000Z'),
        endDate: new Date('2026-05-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuse dependencyIds avec doublons', async () => {
    await expect(
      service.create(clientId, projectId, scenarioId, {
        title: 'Task A',
        dependencyIds: ['task-1', 'task-1'],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuse auto-dépendance en update', async () => {
    prisma.projectScenarioTask.findFirst.mockResolvedValueOnce({
      id: 'task-1',
      clientId,
      scenarioId,
      sourceProjectTaskId: null,
      title: 'Task A',
      taskType: 'TASK',
      startDate: null,
      endDate: null,
      durationDays: null,
      dependencyIds: [],
      orderIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.update(clientId, projectId, scenarioId, 'task-1', {
        dependencyIds: ['task-1'],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuse dépendance cross-scenario', async () => {
    prisma.projectScenarioTask.findMany.mockResolvedValueOnce([
      { id: 'task-2', scenarioId: 'scenario-2' },
    ]);

    await expect(
      service.create(clientId, projectId, scenarioId, {
        title: 'Task A',
        dependencyIds: ['task-2'],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuse dépendance vers tâche absente', async () => {
    prisma.projectScenarioTask.findMany.mockResolvedValueOnce([]);

    await expect(
      service.create(clientId, projectId, scenarioId, {
        title: 'Task A',
        dependencyIds: ['missing-task'],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('bootstrap refuse si scénario déjà initialisé', async () => {
    prisma.projectScenarioTask.count.mockResolvedValueOnce(1);

    await expect(
      service.bootstrapFromProjectPlan(clientId, projectId, scenarioId),
    ).rejects.toThrow(ConflictException);
  });

  it('bootstrap mappe dependsOnTaskId -> dependencyIds', async () => {
    prisma.projectScenarioTask.count.mockResolvedValueOnce(0);
    prisma.projectTask.findMany.mockResolvedValueOnce([
      {
        id: 'pt-1',
        name: 'A',
        plannedStartDate: new Date('2026-06-01T00:00:00.000Z'),
        plannedEndDate: new Date('2026-06-02T00:00:00.000Z'),
        dependsOnTaskId: null,
      },
      {
        id: 'pt-2',
        name: 'B',
        plannedStartDate: new Date('2026-06-03T00:00:00.000Z'),
        plannedEndDate: new Date('2026-06-04T00:00:00.000Z'),
        dependsOnTaskId: 'pt-1',
      },
      {
        id: 'pt-3',
        name: 'C',
        plannedStartDate: null,
        plannedEndDate: null,
        dependsOnTaskId: 'pt-x',
      },
    ]);
    prisma.projectMilestone.findMany.mockResolvedValueOnce([{ projectTaskId: 'pt-2' }]);

    prisma.projectScenarioTask.create
      .mockResolvedValueOnce({ id: 'st-1' })
      .mockResolvedValueOnce({ id: 'st-2' })
      .mockResolvedValueOnce({ id: 'st-3' });
    prisma.projectScenarioTask.update.mockResolvedValue({});

    const result = await service.bootstrapFromProjectPlan(clientId, projectId, scenarioId);

    expect(result).toEqual({
      scenarioId,
      createdCount: 3,
      skippedDependencyCount: 1,
    });
    expect(prisma.projectScenarioTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'st-2' },
        data: { dependencyIds: ['st-1'] },
      }),
    );
  });

  it('timelineSummary calcule bornes, milestoneCount et duration', async () => {
    prisma.projectScenarioTask.findMany.mockResolvedValueOnce([
      {
        startDate: new Date('2026-07-02T00:00:00.000Z'),
        endDate: new Date('2026-07-05T00:00:00.000Z'),
        taskType: 'TASK',
      },
      {
        startDate: new Date('2026-07-01T00:00:00.000Z'),
        endDate: new Date('2026-07-03T00:00:00.000Z'),
        taskType: 'MILESTONE',
      },
    ]);

    const summary = await service.getTimelineSummary(clientId, projectId, scenarioId);

    expect(summary.plannedStartDate).toBe('2026-07-01T00:00:00.000Z');
    expect(summary.plannedEndDate).toBe('2026-07-05T00:00:00.000Z');
    expect(summary.milestoneCount).toBe(1);
    expect(summary.criticalPathDuration).toBe(5);
  });

  it('list renvoie le format paginé canonique', async () => {
    prisma.projectScenarioTask.findMany.mockResolvedValueOnce([]);
    prisma.projectScenarioTask.count.mockResolvedValueOnce(0);

    const result = await service.list(clientId, projectId, scenarioId, { limit: 20, offset: 0 });
    expect(result).toEqual({ items: [], total: 0, limit: 20, offset: 0 });
  });

  it('refuse un scénario hors scope', async () => {
    prisma.projectScenario.findFirst.mockResolvedValueOnce(null);
    await expect(service.list(clientId, projectId, scenarioId, {})).rejects.toThrow(
      NotFoundException,
    );
  });
});
