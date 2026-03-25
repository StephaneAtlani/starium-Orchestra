import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { MicrosoftConnectionStatus } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectMicrosoftLinksService } from './project-microsoft-links.service';
import { MicrosoftOAuthService } from './microsoft-oauth.service';

describe('ProjectMicrosoftLinksService — RFC-PROJ-INT-007', () => {
  let service: ProjectMicrosoftLinksService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };
  let microsoftOAuth: { getActiveConnection: jest.Mock };

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
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    microsoftOAuth = { getActiveConnection: jest.fn() };

    service = new ProjectMicrosoftLinksService(
      prisma,
      auditLogs as unknown as AuditLogsService,
      microsoftOAuth as unknown as MicrosoftOAuthService,
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
});

