import { NotFoundException } from '@nestjs/common';
import {
  ProjectTaskPriority,
  ProjectTaskStatus,
} from '@prisma/client';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from './project-audit.constants';
import { ProjectTasksService } from './project-tasks.service';
import { ProjectsService } from './projects.service';

describe('ProjectTasksService — audit RFC-PROJ-009', () => {
  let service: ProjectTasksService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };
  let projects: { getProjectForScope: jest.Mock; assertClientUser: jest.Mock };

  const clientId = 'c1';
  const projectId = 'p1';
  const taskId = 't1';

  function baseTask(overrides: Record<string, unknown> = {}) {
    return {
      id: taskId,
      clientId,
      projectId,
      title: 'Tâche',
      description: null,
      assigneeUserId: null,
      status: ProjectTaskStatus.TODO,
      priority: ProjectTaskPriority.MEDIUM,
      dueDate: null,
      completedAt: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      projectTask: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    projects = {
      getProjectForScope: jest.fn().mockResolvedValue({ id: projectId }),
      assertClientUser: jest.fn().mockResolvedValue(undefined),
    };
    service = new ProjectTasksService(
      prisma,
      auditLogs,
      projects as unknown as ProjectsService,
    );
  });

  it('update sans granulaire : uniquement project_task.updated', async () => {
    const existing = baseTask({ title: 'A' });
    const updated = { ...existing, title: 'B' };
    prisma.projectTask.findFirst.mockResolvedValue(existing);
    prisma.projectTask.update.mockResolvedValue(updated);

    await service.update(
      clientId,
      projectId,
      taskId,
      { title: 'B' },
      { actorUserId: 'u1', meta: {} },
    );

    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
        resourceId: taskId,
        oldValue: { title: 'A' },
        newValue: { title: 'B' },
      }),
    );
  });

  it('changement de statut seul : uniquement project_task.status.updated', async () => {
    const existing = baseTask({ status: ProjectTaskStatus.TODO });
    const updated = { ...existing, status: ProjectTaskStatus.IN_PROGRESS };
    prisma.projectTask.findFirst.mockResolvedValue(existing);
    prisma.projectTask.update.mockResolvedValue(updated);

    await service.update(
      clientId,
      projectId,
      taskId,
      { status: ProjectTaskStatus.IN_PROGRESS },
      { actorUserId: 'u1', meta: {} },
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

  it('changement assignee seul : uniquement project_task.assigned', async () => {
    const existing = baseTask({ assigneeUserId: null });
    const updated = { ...existing, assigneeUserId: 'u99' };
    prisma.projectTask.findFirst.mockResolvedValue(existing);
    prisma.projectTask.update.mockResolvedValue(updated);

    await service.update(
      clientId,
      projectId,
      taskId,
      { assigneeUserId: 'u99' },
      { actorUserId: 'u1', meta: {} },
    );

    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_ASSIGNED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
        oldValue: { assigneeUserId: null },
        newValue: { assigneeUserId: 'u99' },
      }),
    );
  });

  it('titre + statut + assignation : trois logs (updated sans status/assignee redondants)', async () => {
    const existing = baseTask({
      title: 'A',
      status: ProjectTaskStatus.TODO,
      assigneeUserId: null,
    });
    const updated = {
      ...existing,
      title: 'B',
      status: ProjectTaskStatus.DONE,
      assigneeUserId: 'u2',
    };
    prisma.projectTask.findFirst.mockResolvedValue(existing);
    prisma.projectTask.update.mockResolvedValue(updated);

    await service.update(
      clientId,
      projectId,
      taskId,
      {
        title: 'B',
        status: ProjectTaskStatus.DONE,
        assigneeUserId: 'u2',
      },
      { actorUserId: 'u1', meta: {} },
    );

    expect(auditLogs.create).toHaveBeenCalledTimes(3);
    expect(auditLogs.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
        oldValue: { title: 'A' },
        newValue: { title: 'B' },
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
        oldValue: { assigneeUserId: null },
        newValue: { assigneeUserId: 'u2' },
      }),
    );
  });

  it('update : projet ou tâche absent sans audit', async () => {
    prisma.projectTask.findFirst.mockResolvedValue(null);

    await expect(
      service.update(clientId, projectId, taskId, { title: 'x' }),
    ).rejects.toThrow(NotFoundException);
    expect(auditLogs.create).not.toHaveBeenCalled();
  });
});
