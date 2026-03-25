import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  MicrosoftConnectionStatus,
  MicrosoftSyncStatus,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectMicrosoftLinksService } from './project-microsoft-links.service';
import { MicrosoftGraphHttpError } from './microsoft-graph.types';
import { MicrosoftOAuthService } from './microsoft-oauth.service';

describe('ProjectMicrosoftLinksService — RFC-PROJ-INT-007', () => {
  let service: ProjectMicrosoftLinksService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };
  let microsoftOAuth: {
    getActiveConnection: jest.Mock;
    ensureFreshAccessToken: jest.Mock;
  };
  let graph: any;
  let projectDocumentContent: { readStariumBuffer: jest.Mock };

  const clientId = 'c1';
  const projectId = 'p1';

  const baseLink = (overrides: Record<string, unknown> = {}) => ({
    id: 'link-1',
    clientId,
    projectId,
    microsoftConnectionId: 'conn-1',
    isEnabled: false,
    teamId: 'team-1',
    teamName: 'Team A',
    channelId: 'ch-1',
    channelName: 'General',
    plannerPlanId: 'plan-1',
    plannerPlanTitle: 'Plan',
    syncTasksEnabled: true,
    syncDocumentsEnabled: true,
    filesDriveId: null,
    filesFolderId: null,
    lastSyncAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      project: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
      projectMicrosoftLink: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      projectTask: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      projectTaskChecklistItem: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue(undefined),
      },
      projectTaskBucket: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      projectTaskMicrosoftSync: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      projectDocument: {
        findMany: jest.fn(),
      },
      projectDocumentMicrosoftSync: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      projectTaskLabel: {
        count: jest.fn().mockResolvedValue(1),
      },
    } as any;

    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    microsoftOAuth = {
      getActiveConnection: jest.fn(),
      ensureFreshAccessToken: jest.fn().mockResolvedValue('access-token'),
    };
    graph = {
      getJson: jest.fn(),
      postJson: jest.fn(),
      patchJson: jest.fn(),
      getPlannerTaskWithEtag: jest.fn(),
      getPlannerTaskDetailsWithEtag: jest.fn(),
      ensureFolderUnderDriveRoot: jest.fn().mockResolvedValue(undefined),
      encodeDrivePathSegments: jest.fn((parts: string[]) =>
        parts.map((p) => encodeURIComponent(p)).join('/'),
      ),
      uploadOrReplaceDriveFile: jest.fn(),
    };

    projectDocumentContent = {
      readStariumBuffer: jest.fn().mockReturnValue(Buffer.from('x')),
    };

    service = new ProjectMicrosoftLinksService(
      prisma,
      auditLogs as unknown as AuditLogsService,
      microsoftOAuth as unknown as MicrosoftOAuthService,
      graph,
      projectDocumentContent as any,
    );

    jest.clearAllMocks();
  });

  it('getConfig : projet autre client => NotFoundException', async () => {
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(service.getConfig(clientId, projectId)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.projectMicrosoftLink.findFirst).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  it('upsertConfig : isEnabled=true sans connexion active => UnprocessableEntityException', async () => {
    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectMicrosoftLink.findFirst.mockResolvedValue(null);
    microsoftOAuth.getActiveConnection.mockResolvedValue(null);

    await expect(
      service.upsertConfig(
        clientId,
        projectId,
        {
          isEnabled: true,
          teamId: 'team-1',
          channelId: 'ch-1',
          plannerPlanId: 'plan-1',
          syncTasksEnabled: true,
          syncDocumentsEnabled: true,
        } as any,
        { actorUserId: 'u1', meta: {} },
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(microsoftOAuth.getActiveConnection).toHaveBeenCalledWith(clientId);
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  it('upsertConfig : isEnabled transition false->true => audit enabled', async () => {
    const existing = baseLink({ isEnabled: false, microsoftConnectionId: null });
    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectMicrosoftLink.findFirst.mockResolvedValue(existing);

    microsoftOAuth.getActiveConnection.mockResolvedValue({
      id: 'conn-new',
      status: MicrosoftConnectionStatus.ACTIVE,
    });

    prisma.projectMicrosoftLink.update.mockResolvedValue({
      ...existing,
      isEnabled: true,
      microsoftConnectionId: 'conn-new',
      teamId: 'team-2',
      channelId: 'ch-2',
      plannerPlanId: 'plan-2',
    });

    await service.upsertConfig(
      clientId,
      projectId,
      {
        isEnabled: true,
        teamId: 'team-2',
        channelId: 'ch-2',
        plannerPlanId: 'plan-2',
        syncTasksEnabled: false,
        syncDocumentsEnabled: true,
      } as any,
      { actorUserId: 'u1', meta: { requestId: 'req-1' } },
    );

    expect(auditLogs.create).toHaveBeenCalledTimes(1);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'project.microsoft_link.enabled',
        resourceType: 'project',
        resourceId: projectId,
        oldValue: expect.objectContaining({ isEnabled: false }),
        newValue: expect.objectContaining({ isEnabled: true }),
        requestId: 'req-1',
      }),
    );
  });

  it('upsertConfig : useMicrosoftPlannerLabels false->true => purge labels tasks (import Planner categories)', async () => {
    const existing = baseLink({
      isEnabled: false,
      useMicrosoftPlannerLabels: false,
      microsoftConnectionId: null,
    });

    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectMicrosoftLink.findFirst.mockResolvedValue(existing);

    microsoftOAuth.getActiveConnection.mockResolvedValue({
      id: 'conn-new',
      status: MicrosoftConnectionStatus.ACTIVE,
    });

    prisma.projectMicrosoftLink.update.mockResolvedValue({
      ...existing,
      isEnabled: true,
      useMicrosoftPlannerLabels: true,
      microsoftConnectionId: 'conn-new',
      plannerPlanId: 'plan-2',
      teamId: 'team-2',
      channelId: 'ch-2',
    });

    const spy = jest
      .spyOn(service as any, 'replaceStariumTaskLabelsWithPlannerCategories')
      .mockResolvedValue(undefined);

    await service.upsertConfig(
      clientId,
      projectId,
      {
        isEnabled: true,
        teamId: 'team-2',
        channelId: 'ch-2',
        plannerPlanId: 'plan-2',
        syncTasksEnabled: true,
        syncDocumentsEnabled: true,
        useMicrosoftPlannerLabels: true,
      } as any,
      { actorUserId: 'u1', meta: {} },
    );

    expect(spy).toHaveBeenCalledWith(clientId, projectId);
  });

  it('upsertConfig : useMicrosoftPlannerLabels déjà true + 0 labels en base => réimport Planner categories', async () => {
    const existing = baseLink({
      isEnabled: true,
      useMicrosoftPlannerLabels: true,
      microsoftConnectionId: 'conn-1',
      plannerPlanId: 'plan-1',
      teamId: 'team-1',
      channelId: 'ch-1',
    });

    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectMicrosoftLink.findFirst.mockResolvedValue(existing);
    prisma.projectMicrosoftLink.update.mockResolvedValue({ ...existing });
    prisma.projectTaskLabel.count.mockResolvedValue(0);
    microsoftOAuth.getActiveConnection.mockResolvedValue({
      id: 'conn-1',
      status: MicrosoftConnectionStatus.ACTIVE,
    });

    const spy = jest
      .spyOn(service as any, 'replaceStariumTaskLabelsWithPlannerCategories')
      .mockResolvedValue(undefined);

    await service.upsertConfig(
      clientId,
      projectId,
      {
        isEnabled: true,
        teamId: 'team-1',
        channelId: 'ch-1',
        plannerPlanId: 'plan-1',
        syncTasksEnabled: true,
        syncDocumentsEnabled: true,
        useMicrosoftPlannerLabels: true,
      } as any,
      { actorUserId: 'u1', meta: {} },
    );

    expect(prisma.projectTaskLabel.count).toHaveBeenCalledWith({
      where: { clientId, projectId },
    });
    expect(spy).toHaveBeenCalledWith(clientId, projectId);
  });

  it('upsertConfig : isEnabled=false => ne pas appeler getActiveConnection et ne pas purger IDs', async () => {
    const existing = baseLink({
      isEnabled: true,
      microsoftConnectionId: 'conn-old',
      teamId: 'team-old',
      channelId: 'ch-old',
      plannerPlanId: 'plan-old',
      teamName: 'Team old',
    });

    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectMicrosoftLink.findFirst.mockResolvedValue(existing);

    prisma.projectMicrosoftLink.update.mockResolvedValue({
      ...existing,
      isEnabled: false,
      // IDs/noms ne doivent pas être modifiés si non fournis dans le PUT
      teamId: 'team-old',
      channelId: 'ch-old',
      plannerPlanId: 'plan-old',
      teamName: 'Team old',
    });

    await service.upsertConfig(
      clientId,
      projectId,
      {
        isEnabled: false,
        // pas de teamId/channelId/plannerPlanId => aucune purge
        syncTasksEnabled: existing.syncTasksEnabled,
        syncDocumentsEnabled: existing.syncDocumentsEnabled,
      } as any,
      { actorUserId: 'u1', meta: {} },
    );

    expect(microsoftOAuth.getActiveConnection).not.toHaveBeenCalled();

    const updateCall = prisma.projectMicrosoftLink.update.mock.calls[0];
    expect(updateCall).toBeDefined();
    const updateArgs = updateCall[0];
    const updateData = updateArgs?.data;
    expect(updateData).toBeDefined();
    expect(updateData).toEqual(
      expect.objectContaining({
        isEnabled: false,
        microsoftConnectionId: 'conn-old',
      }),
    );
    expect(updateData).not.toHaveProperty('teamId');
    expect(updateData).not.toHaveProperty('channelId');
    expect(updateData).not.toHaveProperty('plannerPlanId');

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'project.microsoft_link.updated',
        resourceId: projectId,
      }),
    );
  });

  describe('replaceStariumTaskLabelsWithPlannerCategories', () => {
    it('purge ProjectTaskLabel/assignations Starium puis upsert Planner categories', async () => {
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue({
        plannerPlanId: 'plan-1',
        microsoftConnectionId: 'conn-1',
      });
      microsoftOAuth.ensureFreshAccessToken.mockResolvedValue('access-token');

      graph.getJson.mockResolvedValue({
        categoryDescriptions: {
          category2: 'Label B',
          category1: 'Label A',
          category3: '   ', // doit être filtré
          category4: null,
        },
      });

      const txMock = {
        projectTaskLabelAssignment: {
          deleteMany: jest.fn().mockResolvedValue(undefined),
        },
        projectTaskLabel: {
          deleteMany: jest.fn().mockResolvedValue(undefined),
          create: jest.fn().mockResolvedValue(undefined),
        },
      };

      prisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      await (service as any).replaceStariumTaskLabelsWithPlannerCategories(
        clientId,
        projectId,
      );

      expect(txMock.projectTaskLabelAssignment.deleteMany).toHaveBeenCalledWith(
        { where: { clientId, projectId } },
      );
      expect(txMock.projectTaskLabel.deleteMany).toHaveBeenCalledWith({
        where: { clientId, projectId },
      });
      expect(txMock.projectTaskLabel.create).toHaveBeenCalledTimes(2);

      expect(txMock.projectTaskLabel.create.mock.calls[0][0]).toEqual({
        data: {
          clientId,
          projectId,
          name: 'Label A',
          color: null,
          plannerCategoryId: 'category1',
          sortOrder: 1,
        },
      });
      expect(txMock.projectTaskLabel.create.mock.calls[1][0]).toEqual({
        data: {
          clientId,
          projectId,
          name: 'Label B',
          color: null,
          plannerCategoryId: 'category2',
          sortOrder: 2,
        },
      });
    });
  });

  describe('syncTasks — RFC-PROJ-INT-008', () => {
    const baseTasks = {
      plannedEndDate: new Date('2026-01-10T00:00:00.000Z'),
      actualEndDate: null,
      checklistItems: [] as { id: string; title: string; isChecked: boolean; sortOrder: number; plannerChecklistItemKey: string | null }[],
    };

    const bucketTodos: Array<{ id: string; name: string }> = [
      { id: 'bucket-1', name: 'TODO' },
      { id: 'bucket-2', name: 'IN_PROGRESS' },
      { id: 'bucket-3', name: 'DONE' },
    ];

    it('envoie startDateTime (plannedStartDate) en POST + PATCH tâche Planner', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      const link = baseLink({
        isEnabled: true,
        syncTasksEnabled: true,
        plannerPlanId: 'plan-1',
        microsoftConnectionId: 'conn-1',
        lastSyncAt: null,
      });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(link);

      const start = new Date('2026-03-26T12:00:00.000Z');
      const task = {
        id: 't1',
        name: 'Task 1',
        description: 'D1',
        plannedStartDate: start,
        actualStartDate: null,
        ...baseTasks,
        status: ProjectTaskStatus.TODO,
        priority: ProjectTaskPriority.LOW,
      };
      prisma.projectTask.findMany.mockResolvedValue([task]);
      prisma.projectTaskMicrosoftSync.findMany.mockResolvedValue([]);

      graph.getJson.mockResolvedValue({ value: bucketTodos });
      graph.postJson.mockResolvedValue({ id: 'planner-1' });
      graph.getPlannerTaskWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'task-etag',
      });
      graph.getPlannerTaskDetailsWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'details-etag',
      });
      graph.patchJson.mockResolvedValue(undefined);

      prisma.projectTaskMicrosoftSync.create.mockResolvedValue({ id: 'sync-1' });
      prisma.projectTaskMicrosoftSync.update.mockResolvedValue({ id: 'sync-1' });
      prisma.projectMicrosoftLink.update.mockResolvedValue(undefined);

      await service.syncTasks(clientId, projectId, {
        actorUserId: 'u1',
        meta: {},
      } as any);

      const expectedStart = start.toISOString();
      expect(graph.postJson).toHaveBeenCalledWith(
        expect.anything(),
        'planner/tasks',
        expect.objectContaining({ startDateTime: expectedStart }),
        expect.anything(),
      );
      expect(graph.patchJson.mock.calls[0][2]).toEqual(
        expect.objectContaining({ startDateTime: expectedStart }),
      );
    });

    it('envoie appliedCategories en POST + PATCH tâche Planner si useMicrosoftPlannerLabels=true', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      const link = baseLink({
        isEnabled: true,
        syncTasksEnabled: true,
        useMicrosoftPlannerLabels: true,
        plannerPlanId: 'plan-1',
        microsoftConnectionId: 'conn-1',
        lastSyncAt: null,
      });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(link);

      const task = {
        id: 't1',
        name: 'Task 1',
        description: 'D1',
        plannedStartDate: null,
        actualStartDate: null,
        ...baseTasks,
        status: ProjectTaskStatus.TODO,
        priority: ProjectTaskPriority.LOW,
        labelAssignments: [
          { label: { plannerCategoryId: 'category1' } },
          { label: { plannerCategoryId: 'category2' } },
        ],
      };

      prisma.projectTask.findMany.mockResolvedValue([task]);
      prisma.projectTaskMicrosoftSync.findMany.mockResolvedValue([]);

      graph.getJson.mockResolvedValue({ value: bucketTodos });
      graph.postJson.mockResolvedValue({ id: 'planner-1' });
      graph.getPlannerTaskWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'task-etag',
      });
      graph.getPlannerTaskDetailsWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'details-etag',
      });
      graph.patchJson.mockResolvedValue(undefined);

      prisma.projectTaskMicrosoftSync.create.mockResolvedValue({ id: 'sync-1' });
      prisma.projectTaskMicrosoftSync.update.mockResolvedValue({ id: 'sync-1' });
      prisma.projectMicrosoftLink.update.mockResolvedValue(undefined);

      await service.syncTasks(clientId, projectId, {
        actorUserId: 'u1',
        meta: {},
      } as any);

      expect(graph.postJson).toHaveBeenCalledWith(
        expect.anything(),
        'planner/tasks',
        expect.objectContaining({
          appliedCategories: {
            category1: true,
            category2: true,
          },
        }),
        expect.anything(),
      );

      // PATCH /planner/tasks (1er appel patch)
      expect(graph.patchJson.mock.calls[0][2]).toEqual(
        expect.objectContaining({
          appliedCategories: {
            category1: true,
            category2: true,
          },
        }),
      );
    });

    it('n’envoie pas category7+ dans appliedCategories (limitation Graph plannerTask)', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      const link = baseLink({
        isEnabled: true,
        syncTasksEnabled: true,
        useMicrosoftPlannerLabels: true,
        plannerPlanId: 'plan-1',
        microsoftConnectionId: 'conn-1',
        lastSyncAt: null,
      });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(link);

      const task = {
        id: 't1',
        name: 'Task 1',
        description: 'D1',
        plannedStartDate: null,
        actualStartDate: null,
        ...baseTasks,
        status: ProjectTaskStatus.TODO,
        priority: ProjectTaskPriority.LOW,
        labelAssignments: [
          { label: { plannerCategoryId: 'category1' } },
          { label: { plannerCategoryId: 'category7' } },
        ],
      };

      prisma.projectTask.findMany.mockResolvedValue([task]);
      prisma.projectTaskMicrosoftSync.findMany.mockResolvedValue([]);

      graph.getJson.mockResolvedValue({ value: bucketTodos });
      graph.postJson.mockResolvedValue({ id: 'planner-1' });
      graph.getPlannerTaskWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'task-etag',
      });
      graph.getPlannerTaskDetailsWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'details-etag',
      });
      graph.patchJson.mockResolvedValue(undefined);

      prisma.projectTaskMicrosoftSync.create.mockResolvedValue({ id: 'sync-1' });
      prisma.projectTaskMicrosoftSync.update.mockResolvedValue({ id: 'sync-1' });
      prisma.projectMicrosoftLink.update.mockResolvedValue(undefined);

      await service.syncTasks(clientId, projectId, {
        actorUserId: 'u1',
        meta: {},
      } as any);

      expect(graph.postJson).toHaveBeenCalledWith(
        expect.anything(),
        'planner/tasks',
        expect.objectContaining({
          appliedCategories: { category1: true },
        }),
        expect.anything(),
      );
    });

    it('syncTasks : useMicrosoftPlannerLabels + 0 labels en base => appelle replaceStariumTaskLabelsWithPlannerCategories', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectTaskLabel.count.mockResolvedValue(0);
      const link = baseLink({
        isEnabled: true,
        syncTasksEnabled: true,
        useMicrosoftPlannerLabels: true,
        plannerPlanId: 'plan-1',
        microsoftConnectionId: 'conn-1',
        lastSyncAt: null,
      });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(link);

      const task = {
        id: 't1',
        name: 'Task 1',
        description: 'D1',
        plannedStartDate: null,
        actualStartDate: null,
        ...baseTasks,
        status: ProjectTaskStatus.TODO,
        priority: ProjectTaskPriority.LOW,
      };
      prisma.projectTask.findMany.mockResolvedValue([task]);
      prisma.projectTaskMicrosoftSync.findMany.mockResolvedValue([]);

      graph.getJson.mockResolvedValue({ value: bucketTodos });
      graph.postJson.mockResolvedValue({ id: 'planner-1' });
      graph.getPlannerTaskWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'task-etag',
      });
      graph.getPlannerTaskDetailsWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'details-etag',
      });
      graph.patchJson.mockResolvedValue(undefined);

      prisma.projectTaskMicrosoftSync.create.mockResolvedValue({ id: 'sync-1' });
      prisma.projectTaskMicrosoftSync.update.mockResolvedValue({ id: 'sync-1' });
      prisma.projectMicrosoftLink.update.mockResolvedValue(undefined);

      const spy = jest
        .spyOn(service as any, 'replaceStariumTaskLabelsWithPlannerCategories')
        .mockResolvedValue(undefined);

      await service.syncTasks(clientId, projectId, {
        actorUserId: 'u1',
        meta: {},
      } as any);

      expect(spy).toHaveBeenCalledWith(clientId, projectId);
      spy.mockRestore();
    });

    it('crée Planner OK puis échec PATCH details => mapping final ERROR (pas SYNCED)', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      const link = baseLink({
        isEnabled: true,
        syncTasksEnabled: true,
        microsoftConnectionId: 'conn-1',
        plannerPlanId: 'plan-1',
        lastSyncAt: null,
      });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(link);

      const task = {
        id: 't1',
        name: 'Task 1',
        description: 'D1',
        ...baseTasks,
        status: ProjectTaskStatus.TODO,
        priority: ProjectTaskPriority.LOW,
      };
      prisma.projectTask.findMany.mockResolvedValue([task]);
      prisma.projectTaskMicrosoftSync.findMany.mockResolvedValue([]);

      graph.getJson.mockResolvedValue({ value: bucketTodos });
      graph.postJson.mockResolvedValue({ id: 'planner-1' });
      graph.getPlannerTaskWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'task-etag',
      });
      graph.patchJson.mockResolvedValueOnce(undefined); // PATCH /planner/tasks
      graph.getPlannerTaskDetailsWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'details-etag',
      });
      graph.patchJson.mockRejectedValueOnce(
        new Error('Graph PATCH details failed'),
      ); // PATCH /planner/tasks/{id}/details

      prisma.projectTaskMicrosoftSync.create.mockResolvedValue({
        id: 'sync-1',
      });
      prisma.projectTaskMicrosoftSync.update.mockResolvedValue({
        id: 'sync-1',
      });

      await service.syncTasks(clientId, projectId, {
        actorUserId: 'u1',
        meta: {},
      } as any);

      // mapping doit être passé en ERROR
      expect(prisma.projectTaskMicrosoftSync.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clientId_projectTaskId: { clientId, projectTaskId: 't1' },
          },
          data: expect.objectContaining({
            syncStatus: MicrosoftSyncStatus.ERROR,
            lastError: expect.any(String),
          }),
        }),
      );

      // lastSyncAt inchangé
      expect(prisma.projectMicrosoftLink.update).not.toHaveBeenCalled();

      // audit failure créée
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'project.microsoft_sync.failed',
          resourceId: 't1',
        }),
      );
    });

    it('update task nécessite ETag différent task vs details => 2 helpers appelés séparément', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      const link = baseLink({
        isEnabled: true,
        syncTasksEnabled: true,
        plannerPlanId: 'plan-1',
        microsoftConnectionId: 'conn-1',
      });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(link);

      const task = {
        id: 't1',
        name: 'Task 1',
        description: 'D1',
        ...baseTasks,
        status: ProjectTaskStatus.IN_PROGRESS,
        priority: ProjectTaskPriority.HIGH,
      };
      prisma.projectTask.findMany.mockResolvedValue([task]);

      prisma.projectTaskMicrosoftSync.findMany.mockResolvedValue([
        { id: 'sync-1', projectTaskId: 't1', plannerTaskId: 'planner-1' },
      ]);

      graph.getJson.mockResolvedValue({ value: bucketTodos });
      graph.getPlannerTaskWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'task-etag',
      });
      graph.getPlannerTaskDetailsWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'details-etag',
      });
      graph.patchJson.mockResolvedValue(undefined);
      prisma.projectTaskMicrosoftSync.update.mockResolvedValue(undefined);
      prisma.projectMicrosoftLink.update.mockResolvedValue(undefined);

      await service.syncTasks(clientId, projectId, {
        actorUserId: 'u1',
        meta: {},
      } as any);

      expect(graph.getPlannerTaskWithEtag).toHaveBeenCalledTimes(1);
      expect(graph.getPlannerTaskDetailsWithEtag).toHaveBeenCalledTimes(1);

      const taskPatchInit = graph.patchJson.mock.calls[0][3];
      const detailsPatchInit = graph.patchJson.mock.calls[1][3];

      expect(taskPatchInit.headers['If-Match']).toBe('task-etag');
      expect(detailsPatchInit.headers['If-Match']).toBe('details-etag');

      // lastSyncAt mis à jour + audit success
      expect(prisma.projectMicrosoftLink.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: link.id },
          data: expect.objectContaining({ lastSyncAt: expect.any(Date) }),
        }),
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'project.microsoft_tasks.synced',
        }),
      );
    });

    it('batch échoue sur une tâche => stop immédiat + lastSyncAt inchangé', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      const link = baseLink({
        isEnabled: true,
        syncTasksEnabled: true,
        plannerPlanId: 'plan-1',
        microsoftConnectionId: 'conn-1',
      });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(link);

      const task1 = {
        id: 't1',
        name: 'Task 1',
        description: 'D1',
        ...baseTasks,
        status: ProjectTaskStatus.TODO,
        priority: ProjectTaskPriority.LOW,
      };
      const task2 = {
        id: 't2',
        name: 'Task 2',
        description: 'D2',
        ...baseTasks,
        status: ProjectTaskStatus.DONE,
        priority: ProjectTaskPriority.MEDIUM,
      };
      prisma.projectTask.findMany.mockResolvedValue([task1, task2]);
      prisma.projectTaskMicrosoftSync.findMany.mockResolvedValue([]);

      graph.getJson.mockResolvedValue({ value: bucketTodos });
      graph.postJson.mockResolvedValue({ id: 'planner-1' });
      graph.getPlannerTaskWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'task-etag',
      });
      graph.patchJson.mockResolvedValueOnce(undefined); // PATCH /planner/tasks
      graph.getPlannerTaskDetailsWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'details-etag',
      });
      graph.patchJson.mockRejectedValueOnce(new Error('details fail'));

      prisma.projectTaskMicrosoftSync.create.mockResolvedValue({
        id: 'sync-1',
      });
      prisma.projectTaskMicrosoftSync.update.mockResolvedValue({
        id: 'sync-1',
      });

      await service.syncTasks(clientId, projectId, {
        actorUserId: 'u1',
        meta: {},
      } as any);

      // stop: pas de second POST Planner
      expect(graph.postJson).toHaveBeenCalledTimes(1);
      expect(prisma.projectMicrosoftLink.update).not.toHaveBeenCalled();

      // mapping du 1er task en ERROR
      expect(prisma.projectTaskMicrosoftSync.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clientId_projectTaskId: { clientId, projectTaskId: 't1' },
          },
          data: expect.objectContaining({
            syncStatus: MicrosoftSyncStatus.ERROR,
          }),
        }),
      );
    });

    it('réussite complète => audit project.microsoft_tasks.synced + lastSyncAt mis à jour', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      const link = baseLink({
        isEnabled: true,
        syncTasksEnabled: true,
        plannerPlanId: 'plan-1',
        microsoftConnectionId: 'conn-1',
        lastSyncAt: null,
      });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(link);

      const task = {
        id: 't1',
        name: 'Task 1',
        description: 'D1',
        ...baseTasks,
        status: ProjectTaskStatus.DONE,
        priority: ProjectTaskPriority.CRITICAL,
      };
      prisma.projectTask.findMany.mockResolvedValue([task]);
      prisma.projectTaskMicrosoftSync.findMany.mockResolvedValue([]);

      graph.getJson.mockResolvedValue({ value: bucketTodos });
      graph.postJson.mockResolvedValue({ id: 'planner-1' });
      graph.getPlannerTaskWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'task-etag',
      });
      graph.getPlannerTaskDetailsWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'details-etag',
      });
      graph.patchJson.mockResolvedValue(undefined);

      prisma.projectTaskMicrosoftSync.create.mockResolvedValue({
        id: 'sync-1',
      });
      prisma.projectTaskMicrosoftSync.update.mockResolvedValue({
        id: 'sync-1',
      });
      prisma.projectMicrosoftLink.update.mockResolvedValue(undefined);

      await service.syncTasks(clientId, projectId, {
        actorUserId: 'u1',
        meta: { requestId: 'req-1' },
      } as any);

      expect(prisma.projectTaskMicrosoftSync.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clientId_projectTaskId: { clientId, projectTaskId: 't1' },
          },
          data: expect.objectContaining({
            syncStatus: MicrosoftSyncStatus.SYNCED,
            lastError: null,
            lastPushedAt: expect.any(Date),
          }),
        }),
      );

      expect(prisma.projectMicrosoftLink.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: link.id },
          data: expect.objectContaining({ lastSyncAt: expect.any(Date) }),
        }),
      );

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'project.microsoft_tasks.synced',
          resourceId: projectId,
          requestId: 'req-1',
        }),
      );
    });

    it('après sync OK : colonnes Planner FR (ex. Bloqué) + align bucketId Starium via plannerBucketId', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      const link = baseLink({
        isEnabled: true,
        syncTasksEnabled: true,
        plannerPlanId: 'plan-1',
        microsoftConnectionId: 'conn-1',
        lastSyncAt: null,
      });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(link);

      const bucketsFr = [
        { id: 'gb-todo', name: 'À faire' },
        { id: 'gb-blocked', name: 'Bloqué' },
        { id: 'gb-done', name: 'Terminée' },
      ];

      const task = {
        id: 't1',
        name: 'Task 1',
        description: 'D1',
        ...baseTasks,
        status: ProjectTaskStatus.BLOCKED,
        priority: ProjectTaskPriority.MEDIUM,
        bucketId: null as string | null,
      };
      prisma.projectTask.findMany.mockResolvedValue([task]);
      prisma.projectTaskMicrosoftSync.findMany.mockResolvedValue([]);

      graph.getJson.mockResolvedValue({ value: bucketsFr });
      graph.postJson.mockResolvedValue({ id: 'planner-1' });
      graph.getPlannerTaskWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'task-etag',
      });
      graph.getPlannerTaskDetailsWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'details-etag',
      });
      graph.patchJson.mockResolvedValue(undefined);

      prisma.projectTaskMicrosoftSync.create.mockResolvedValue({
        id: 'sync-1',
      });
      prisma.projectTaskMicrosoftSync.update.mockResolvedValue({
        id: 'sync-1',
      });
      prisma.projectMicrosoftLink.update.mockResolvedValue(undefined);

      prisma.projectTaskBucket.findMany.mockResolvedValue([
        {
          id: 'starium-bucket-blocked',
          name: 'Bloqué',
          plannerBucketId: 'gb-blocked',
        },
      ]);

      await service.syncTasks(clientId, projectId, {
        actorUserId: 'u1',
        meta: {},
      } as any);

      expect(graph.postJson).toHaveBeenCalledWith(
        expect.anything(),
        'planner/tasks',
        expect.objectContaining({ bucketId: 'gb-blocked' }),
        expect.anything(),
      );

      expect(prisma.projectTask.updateMany).toHaveBeenCalledWith({
        where: { id: 't1', clientId, projectId },
        data: { bucketId: 'starium-bucket-blocked' },
      });
    });

    it('après sync OK : colonne Planner « À faire » alignée sur bucket Starium nommé TODO (sans plannerBucketId)', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      const link = baseLink({
        isEnabled: true,
        syncTasksEnabled: true,
        plannerPlanId: 'plan-1',
        microsoftConnectionId: 'conn-1',
        lastSyncAt: null,
      });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(link);

      const bucketsFr = [
        { id: 'gb-af', name: 'À faire' },
        { id: 'gb-done', name: 'Terminée' },
      ];

      const task = {
        id: 't1',
        name: 'Debut',
        description: 'ceci est le debut',
        ...baseTasks,
        status: ProjectTaskStatus.TODO,
        priority: ProjectTaskPriority.CRITICAL,
        bucketId: null as string | null,
      };
      prisma.projectTask.findMany.mockResolvedValue([task]);
      prisma.projectTaskMicrosoftSync.findMany.mockResolvedValue([]);

      prisma.projectTaskBucket.findMany.mockResolvedValue([
        { id: 'b-todo', name: 'TODO', plannerBucketId: null },
        { id: 'b-done', name: 'DONE', plannerBucketId: null },
      ]);

      graph.getJson.mockResolvedValue({ value: bucketsFr });
      graph.postJson.mockResolvedValue({ id: 'planner-1' });
      graph.getPlannerTaskWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'task-etag',
      });
      graph.getPlannerTaskDetailsWithEtag.mockResolvedValue({
        json: { id: 'planner-1' },
        etag: 'details-etag',
      });
      graph.patchJson.mockResolvedValue(undefined);

      prisma.projectTaskMicrosoftSync.create.mockResolvedValue({
        id: 'sync-1',
      });
      prisma.projectTaskMicrosoftSync.update.mockResolvedValue({
        id: 'sync-1',
      });
      prisma.projectMicrosoftLink.update.mockResolvedValue(undefined);

      await service.syncTasks(clientId, projectId, {
        actorUserId: 'u1',
        meta: {},
      } as any);

      expect(graph.postJson).toHaveBeenCalledWith(
        expect.anything(),
        'planner/tasks',
        expect.objectContaining({ bucketId: 'gb-af' }),
        expect.anything(),
      );

      expect(prisma.projectTask.updateMany).toHaveBeenCalledWith({
        where: { id: 't1', clientId, projectId },
        data: { bucketId: 'b-todo' },
      });

      expect(prisma.projectTaskBucket.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'b-todo',
          clientId,
          projectId,
          plannerBucketId: null,
        },
        data: { plannerBucketId: 'gb-af' },
      });
    });
  });

  describe('syncDocuments (RFC-PROJ-INT-009)', () => {
    const linkDocsEnabled = () =>
      baseLink({
        isEnabled: true,
        microsoftConnectionId: 'conn-1',
        syncDocumentsEnabled: true,
        filesDriveId: 'drive-1',
      });

    const fullDoc = (overrides: Record<string, unknown> = {}) => ({
      id: 'doc-1',
      clientId,
      projectId,
      name: 'Rapport',
      originalFilename: 'rapport.pdf',
      mimeType: 'application/pdf',
      extension: 'pdf',
      storageKey: 'k/rapport.pdf',
      status: 'ACTIVE',
      storageType: 'STARIUM',
      category: 'GENERAL',
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
      deletedAt: null,
      externalUrl: null,
      description: null,
      tags: null,
      uploadedByUserId: null,
      sizeBytes: 100,
      ...overrides,
    });

    it('sans filesDriveId => UnprocessableEntityException', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(
        baseLink({
          isEnabled: true,
          microsoftConnectionId: 'conn-1',
          syncDocumentsEnabled: true,
          filesDriveId: null,
        }),
      );

      await expect(
        service.syncDocuments(clientId, projectId),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('upload OK petit fichier => SYNCED, lastSyncAt, audit documents.synced', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(linkDocsEnabled());
      prisma.projectDocument.findMany
        .mockResolvedValueOnce([
          { id: 'doc-1', storageType: 'STARIUM', storageKey: 'k/rapport.pdf' },
        ])
        .mockResolvedValueOnce([fullDoc()]);
      prisma.projectDocumentMicrosoftSync.findMany.mockResolvedValue([]);
      graph.uploadOrReplaceDriveFile.mockResolvedValue({ id: 'item-1' });
      prisma.projectDocumentMicrosoftSync.create.mockResolvedValue({ id: 's1' });
      prisma.projectDocumentMicrosoftSync.update.mockResolvedValue({ id: 's1' });
      prisma.projectMicrosoftLink.update.mockResolvedValue(undefined);

      const r = await service.syncDocuments(clientId, projectId, {
        actorUserId: 'u1',
        meta: { requestId: 'r1' },
      } as any);

      expect(r).toEqual({ total: 1, synced: 1, failed: 0, skipped: 0 });
      expect(graph.ensureFolderUnderDriveRoot).toHaveBeenCalledWith(
        'access-token',
        'drive-1',
        `starium-project-${projectId}`,
      );
      expect(graph.uploadOrReplaceDriveFile).toHaveBeenCalledWith(
        'access-token',
        'drive-1',
        expect.any(String),
        expect.any(Buffer),
        'application/pdf',
        null,
      );
      expect(prisma.projectMicrosoftLink.update).toHaveBeenCalled();
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'project.microsoft_documents.synced',
          resourceId: projectId,
        }),
      );
    });

    it('échec upload => stop, pas de lastSyncAt documents.synced', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(linkDocsEnabled());
      prisma.projectDocument.findMany
        .mockResolvedValueOnce([
          { id: 'doc-1', storageType: 'STARIUM', storageKey: 'a' },
          { id: 'doc-2', storageType: 'STARIUM', storageKey: 'b' },
        ])
        .mockResolvedValueOnce([fullDoc({ id: 'doc-1' }), fullDoc({ id: 'doc-2', name: 'B' })]);
      prisma.projectDocumentMicrosoftSync.findMany.mockResolvedValue([]);
      graph.uploadOrReplaceDriveFile
        .mockRejectedValueOnce(new MicrosoftGraphHttpError('fail', 400, 'x', 'fail'))
        .mockResolvedValue({ id: 'item-2' });

      const r = await service.syncDocuments(clientId, projectId, {
        actorUserId: 'u1',
        meta: {},
      } as any);

      expect(r.synced).toBe(0);
      expect(r.failed).toBe(1);
      expect(graph.uploadOrReplaceDriveFile).toHaveBeenCalledTimes(1);
      expect(
        auditLogs.create.mock.calls.some(
          (c) => c[0].action === 'project.microsoft_sync.failed',
        ),
      ).toBe(true);
      const syncedAudit = auditLogs.create.mock.calls.find(
        (c) => c[0].action === 'project.microsoft_documents.synced',
      );
      expect(syncedAudit).toBeUndefined();
    });

    it('overwrite : passe driveItemId existant à Graph', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(linkDocsEnabled());
      prisma.projectDocument.findMany
        .mockResolvedValueOnce([
          { id: 'doc-1', storageType: 'STARIUM', storageKey: 'a' },
        ])
        .mockResolvedValueOnce([fullDoc()]);
      prisma.projectDocumentMicrosoftSync.findMany.mockResolvedValue([
        {
          id: 's1',
          projectDocumentId: 'doc-1',
          driveItemId: 'existing-item',
        },
      ]);
      graph.uploadOrReplaceDriveFile.mockResolvedValue({ id: 'existing-item' });
      prisma.projectDocumentMicrosoftSync.update.mockResolvedValue({});

      await service.syncDocuments(clientId, projectId);

      expect(graph.uploadOrReplaceDriveFile).toHaveBeenCalledWith(
        'access-token',
        'drive-1',
        expect.any(String),
        expect.any(Buffer),
        'application/pdf',
        'existing-item',
      );
    });

    it('skipped : documents non STARIUM exclus du total', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectMicrosoftLink.findFirst.mockResolvedValue(linkDocsEnabled());
      prisma.projectDocument.findMany
        .mockResolvedValueOnce([
          { id: 'doc-x', storageType: 'EXTERNAL', storageKey: null },
          { id: 'doc-1', storageType: 'STARIUM', storageKey: 'a' },
        ])
        .mockResolvedValueOnce([fullDoc()]);
      prisma.projectDocumentMicrosoftSync.findMany.mockResolvedValue([]);
      graph.uploadOrReplaceDriveFile.mockResolvedValue({ id: 'item-1' });
      prisma.projectDocumentMicrosoftSync.create.mockResolvedValue({});
      prisma.projectDocumentMicrosoftSync.update.mockResolvedValue({});
      prisma.projectMicrosoftLink.update.mockResolvedValue(undefined);

      const r = await service.syncDocuments(clientId, projectId);

      expect(r.skipped).toBe(1);
      expect(r.total).toBe(1);
    });
  });
});

