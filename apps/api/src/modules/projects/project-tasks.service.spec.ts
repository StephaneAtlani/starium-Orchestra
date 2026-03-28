import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ProjectTaskPriority,
  ProjectTaskStatus,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from './project-audit.constants';
import { ActionPlansService } from './action-plans.service';
import { ProjectTasksService } from './project-tasks.service';
import { ProjectsService } from './projects.service';

describe('ProjectTasksService — audit RFC-PROJ-009', () => {
  let service: ProjectTasksService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };
  let projects: {
    getProjectForScope: jest.Mock;
    assertClientUser: jest.Mock;
    assertBudgetLineInClient: jest.Mock;
  };
  let actionPlans: { touchProgressForPlans: jest.Mock };

  const clientId = 'c1';
  const projectId = 'p1';
  const taskId = 't1';

  function baseTask(overrides: Record<string, unknown> = {}) {
    return {
      id: taskId,
      clientId,
      projectId,
      name: 'Tâche',
      code: null,
      description: null,
      ownerUserId: null,
      status: ProjectTaskStatus.TODO,
      priority: ProjectTaskPriority.MEDIUM,
      progress: 0,
      plannedStartDate: null,
      plannedEndDate: null,
      actualStartDate: null,
      actualEndDate: null,
      phaseId: null,
      dependsOnTaskId: null,
      dependencyType: null,
      budgetLineId: null,
      createdByUserId: null,
      updatedByUserId: null,
      sortOrder: 0,
      actionPlanId: null,
      riskId: null,
      bucketId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      projectTask: {
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      projectTaskLabel: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
      projectTaskChecklistItem: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      projectTaskPhase: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    projects = {
      getProjectForScope: jest.fn().mockResolvedValue({ id: projectId }),
      assertClientUser: jest.fn().mockResolvedValue(undefined),
      assertBudgetLineInClient: jest.fn().mockResolvedValue(undefined),
    };
    actionPlans = {
      touchProgressForPlans: jest.fn().mockResolvedValue(undefined),
    };
    service = new ProjectTasksService(
      prisma,
      auditLogs as unknown as AuditLogsService,
      projects as unknown as ProjectsService,
      actionPlans as unknown as ActionPlansService,
    );
  });

  it('update sans granulaire : uniquement project_task.updated', async () => {
    const existing = baseTask({ name: 'A' });
    const updated = { ...existing, name: 'B' };
    prisma.projectTask.findFirst.mockResolvedValue(existing);
    prisma.projectTask.update.mockResolvedValue(updated);
    prisma.projectTask.findFirstOrThrow.mockResolvedValue({
      ...updated,
      checklistItems: [],
    });

    await service.update(
      clientId,
      projectId,
      taskId,
      { name: 'B' },
      { actorUserId: 'u1', meta: {} },
      'u1',
    );

    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
        resourceId: taskId,
        oldValue: { name: 'A' },
        newValue: { name: 'B' },
      }),
    );
  });

  it('update : remplace labels (taskLabelIds) via purge + create assignations', async () => {
    const existing = baseTask();
    const updated = { ...existing };

    prisma.projectTask.findFirst.mockResolvedValue(existing);
    prisma.projectTask.update.mockResolvedValue(updated);
    prisma.projectTask.findFirstOrThrow.mockResolvedValue({
      ...updated,
      checklistItems: [],
      labelAssignments: [{ labelId: 'l1' }, { labelId: 'l2' }],
    });

    prisma.projectTaskLabel.findMany.mockResolvedValue([
      { id: 'l1' },
      { id: 'l2' },
    ]);

    const txMock = {
      projectTaskLabelAssignment: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    prisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

    await service.update(
      clientId,
      projectId,
      taskId,
      { taskLabelIds: ['l1', 'l2', 'l1'] } as any,
      { actorUserId: 'u1', meta: {} },
      'u1',
    );

    expect(prisma.projectTaskLabel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId, projectId, id: { in: ['l1', 'l2'] } },
      }),
    );

    expect(txMock.projectTaskLabelAssignment.deleteMany).toHaveBeenCalledWith(
      { where: { clientId, projectId, projectTaskId: taskId } },
    );
    expect(txMock.projectTaskLabelAssignment.create).toHaveBeenCalledTimes(2);
    expect(txMock.projectTaskLabelAssignment.create).toHaveBeenNthCalledWith(
      1,
      {
        data: {
          clientId,
          projectId,
          projectTaskId: taskId,
          labelId: 'l1',
        },
      },
    );
    expect(txMock.projectTaskLabelAssignment.create).toHaveBeenNthCalledWith(
      2,
      {
        data: {
          clientId,
          projectId,
          projectTaskId: taskId,
          labelId: 'l2',
        },
      },
    );
  });

  it('changement de statut seul : uniquement project_task.status.updated', async () => {
    const existing = baseTask({ status: ProjectTaskStatus.TODO });
    const updated = {
      ...existing,
      status: ProjectTaskStatus.IN_PROGRESS,
      progress: 0,
    };
    prisma.projectTask.findFirst.mockResolvedValue(existing);
    prisma.projectTask.update.mockResolvedValue(updated);
    prisma.projectTask.findFirstOrThrow.mockResolvedValue({
      ...updated,
      checklistItems: [],
    });

    await service.update(
      clientId,
      projectId,
      taskId,
      { status: ProjectTaskStatus.IN_PROGRESS },
      { actorUserId: 'u1', meta: {} },
      'u1',
    );

    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_STATUS_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
        oldValue: { status: ProjectTaskStatus.TODO },
        newValue: { status: ProjectTaskStatus.IN_PROGRESS },
      }),
    );
  });

  it('changement owner seul : uniquement project_task.assigned', async () => {
    const existing = baseTask({ ownerUserId: null });
    const updated = { ...existing, ownerUserId: 'u99' };
    prisma.projectTask.findFirst.mockResolvedValue(existing);
    prisma.projectTask.update.mockResolvedValue(updated);
    prisma.projectTask.findFirstOrThrow.mockResolvedValue({
      ...updated,
      checklistItems: [],
    });

    await service.update(
      clientId,
      projectId,
      taskId,
      { ownerUserId: 'u99' },
      { actorUserId: 'u1', meta: {} },
      'u1',
    );

    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_ASSIGNED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
        oldValue: { ownerUserId: null },
        newValue: { ownerUserId: 'u99' },
      }),
    );
  });

  it('nom + statut + owner : trois logs (updated sans status/owner redondants)', async () => {
    const existing = baseTask({
      name: 'A',
      status: ProjectTaskStatus.TODO,
      ownerUserId: null,
    });
    const updated = {
      ...existing,
      name: 'B',
      status: ProjectTaskStatus.DONE,
      progress: 100,
      ownerUserId: 'u2',
    };
    prisma.projectTask.findFirst.mockResolvedValue(existing);
    prisma.projectTask.update.mockResolvedValue(updated);
    prisma.projectTask.findFirstOrThrow.mockResolvedValue({
      ...updated,
      checklistItems: [],
    });

    await service.update(
      clientId,
      projectId,
      taskId,
      {
        name: 'B',
        status: ProjectTaskStatus.DONE,
        ownerUserId: 'u2',
      },
      { actorUserId: 'u1', meta: {} },
      'u1',
    );

    expect(auditLogs.create).toHaveBeenCalledTimes(3);
    expect(auditLogs.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
        oldValue: { name: 'A', progress: 0 },
        newValue: { name: 'B', progress: 100 },
      }),
    );
    expect(auditLogs.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_STATUS_UPDATED,
        oldValue: { status: ProjectTaskStatus.TODO },
        newValue: { status: ProjectTaskStatus.DONE },
      }),
    );
    expect(auditLogs.create).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_ASSIGNED,
        oldValue: { ownerUserId: null },
        newValue: { ownerUserId: 'u2' },
      }),
    );
  });

  it('update : projet ou tâche absent sans audit', async () => {
    prisma.projectTask.findFirst.mockResolvedValue(null);

    await expect(
      service.update(clientId, projectId, taskId, { name: 'x' }),
    ).rejects.toThrow(NotFoundException);
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  describe('validation dates / progress (RFC-PROJ-012)', () => {
    it('create rejette progress > 100', async () => {
      await expect(
        service.create(clientId, projectId, {
          name: 'x',
          progress: 101,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.projectTask.create).not.toHaveBeenCalled();
    });

    it('create rejette fin planifiée avant début', async () => {
      await expect(
        service.create(clientId, projectId, {
          name: 'x',
          plannedStartDate: '2026-01-10T00:00:00.000Z',
          plannedEndDate: '2026-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.projectTask.create).not.toHaveBeenCalled();
    });
  });
});
