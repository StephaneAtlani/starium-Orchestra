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
      projectMicrosoftLink: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      projectTask: {
        findMany: jest.fn(),
      },
      projectTaskBucket: {
        findMany: jest.fn().mockResolvedValue([]),
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

  describe('syncTasks — RFC-PROJ-INT-008', () => {
    const baseTasks = {
      plannedEndDate: new Date('2026-01-10T00:00:00.000Z'),
      actualEndDate: null,
    };

    const bucketTodos: Array<{ id: string; name: string }> = [
      { id: 'bucket-1', name: 'TODO' },
      { id: 'bucket-2', name: 'IN_PROGRESS' },
      { id: 'bucket-3', name: 'DONE' },
    ];

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

