import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  MicrosoftConnectionStatus,
  ProjectMicrosoftTeamsProvisioningStatus,
} from '@prisma/client';
import { ProjectMicrosoftTeamsProvisioningService } from './project-microsoft-teams-provisioning.service';
import { MicrosoftGraphHttpError } from './microsoft-graph.types';

describe('ProjectMicrosoftTeamsProvisioningService', () => {
  let service: ProjectMicrosoftTeamsProvisioningService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };
  let queueService: any;
  let microsoftOAuth: any;
  let graph: any;

  const clientId = 'client-1';
  const projectId = 'project-1';

  beforeEach(() => {
    prisma = {
      project: { findFirst: jest.fn() },
      projectMicrosoftLink: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      projectMicrosoftTeamsProvisioningSettings: {
        findUnique: jest.fn(),
      },
      projectMicrosoftTeamsProvisioning: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      projectMicrosoftTeamsChannelTemplate: {
        findMany: jest.fn(),
      },
      microsoftConnection: {
        findFirst: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    queueService = {
      enqueueProjectMicrosoftTeamsProvisioning: jest
        .fn()
        .mockResolvedValue({ id: 'job-1' }),
      getProjectMicrosoftTeamsProvisioningQueue: jest.fn().mockReturnValue({
        getJob: jest.fn(),
      }),
    };
    microsoftOAuth = {
      getActiveConnection: jest.fn(),
    };
    graph = {
      createTeam: jest.fn(),
      pollAsyncOperation: jest.fn(),
      getTeam: jest.fn(),
      getPrimaryTeamChannel: jest.fn(),
      listTeamChannels: jest.fn(),
      createTeamChannel: jest.fn(),
    };

    service = new ProjectMicrosoftTeamsProvisioningService(
      prisma,
      auditLogs as any,
      queueService,
      microsoftOAuth,
      graph,
    );
  });

  it('refuse de démarrer si le setting client est désactivé', async () => {
    prisma.project.findFirst.mockResolvedValue({
      id: projectId,
      name: 'Projet Alpha',
      code: 'PROJ-1',
      ownerFreeLabel: null,
      owner: null,
    });
    prisma.projectMicrosoftTeamsProvisioningSettings.findUnique.mockResolvedValue({
      isEnabled: false,
      teamNameTemplate: '{{code}} - {{name}}',
      teamDescriptionTemplate: null,
    });

    await expect(
      service.startProvisioning(clientId, projectId, 'u1'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('crée un run PENDING puis l’enqueue', async () => {
    prisma.project.findFirst.mockResolvedValue({
      id: projectId,
      name: 'Projet Alpha',
      code: 'PROJ-1',
      ownerFreeLabel: null,
      owner: null,
    });
    prisma.projectMicrosoftTeamsProvisioningSettings.findUnique.mockResolvedValue({
      isEnabled: true,
      offerOnProjectCreate: false,
      teamNameTemplate: '{{code}} - {{name}}',
      teamDescriptionTemplate: 'Description',
    });
    prisma.projectMicrosoftLink.findFirst.mockResolvedValue(null);
    prisma.projectMicrosoftTeamsProvisioning.findFirst.mockResolvedValue(null);
    microsoftOAuth.getActiveConnection.mockResolvedValue({
      id: 'conn-1',
      status: MicrosoftConnectionStatus.ACTIVE,
    });
    prisma.projectMicrosoftTeamsProvisioning.create.mockResolvedValue({
      id: 'prov-1',
      clientId,
      projectId,
      status: ProjectMicrosoftTeamsProvisioningStatus.PENDING,
      teamDisplayName: 'PROJ-1 - Projet Alpha',
      teamDescription: 'Description',
      microsoftTeamId: null,
      teamWebUrl: null,
      graphOperationUrl: null,
      graphContentLocation: null,
      graphCreateRequestedAt: null,
      retryCount: 0,
      retryRequestedAt: null,
      currentJobId: null,
      lastHeartbeatAt: null,
      errorCode: null,
      errorMessage: null,
      resolvedAt: null,
      resolutionType: null,
      createdAt: new Date('2026-07-17T08:00:00.000Z'),
      updatedAt: new Date('2026-07-17T08:00:00.000Z'),
    });
    prisma.projectMicrosoftTeamsProvisioning.update.mockResolvedValue({
      id: 'prov-1',
      clientId,
      projectId,
      status: ProjectMicrosoftTeamsProvisioningStatus.PENDING,
      teamDisplayName: 'PROJ-1 - Projet Alpha',
      teamDescription: 'Description',
      microsoftTeamId: null,
      teamWebUrl: null,
      graphOperationUrl: null,
      graphContentLocation: null,
      graphCreateRequestedAt: null,
      retryCount: 0,
      retryRequestedAt: null,
      currentJobId: 'job-1',
      lastHeartbeatAt: null,
      errorCode: null,
      errorMessage: null,
      resolvedAt: null,
      resolutionType: null,
      createdAt: new Date('2026-07-17T08:00:00.000Z'),
      updatedAt: new Date('2026-07-17T08:00:00.000Z'),
    });

    const result = await service.startProvisioning(clientId, projectId, 'u1');

    expect(queueService.enqueueProjectMicrosoftTeamsProvisioning).toHaveBeenCalledWith({
      provisioningId: 'prov-1',
    });
    expect(result.currentJobId).toBe('job-1');
  });

  it('bloque le rattachement manuel si un run est actif', async () => {
    prisma.projectMicrosoftTeamsProvisioning.findFirst.mockResolvedValue({
      id: 'prov-1',
      clientId,
      projectId,
      status: ProjectMicrosoftTeamsProvisioningStatus.IN_PROGRESS,
    });

    await expect(
      service.assertManualLinkAllowed(clientId, projectId, 'team-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('classe un 403 Graph en erreur métier de droits lors du worker', async () => {
    prisma.projectMicrosoftTeamsProvisioning.findUnique.mockResolvedValue({
      id: 'prov-1',
      clientId,
      projectId,
      microsoftConnectionId: 'conn-1',
      triggeredByUserId: 'u1',
      status: ProjectMicrosoftTeamsProvisioningStatus.PENDING,
      teamDisplayName: 'PROJ-1 - Projet Alpha',
      teamDescription: null,
      microsoftTeamId: null,
      graphCreateRequestedAt: null,
      graphOperationUrl: null,
      graphContentLocation: null,
      project: {
        id: projectId,
        name: 'Projet Alpha',
        code: 'PROJ-1',
        ownerFreeLabel: null,
        owner: null,
      },
      microsoftConnection: {
        id: 'conn-1',
        clientId,
        status: MicrosoftConnectionStatus.ACTIVE,
      },
    });
    prisma.projectMicrosoftTeamsProvisioning.update.mockResolvedValue({
      id: 'prov-1',
      clientId,
      projectId,
      status: ProjectMicrosoftTeamsProvisioningStatus.FAILED,
      teamDisplayName: 'PROJ-1 - Projet Alpha',
      teamDescription: null,
      microsoftTeamId: null,
      teamWebUrl: null,
      graphOperationUrl: null,
      graphContentLocation: null,
      graphCreateRequestedAt: null,
      retryCount: 0,
      retryRequestedAt: null,
      currentJobId: null,
      lastHeartbeatAt: null,
      errorCode: 'MICROSOFT_TEAM_CREATE_FORBIDDEN',
      errorMessage:
        'Le compte Microsoft délégué actif ne peut pas créer ou administrer cette Team. Reconnectez Microsoft 365 ou relancez le consentement.',
      resolvedAt: null,
      resolutionType: null,
      createdAt: new Date('2026-07-17T08:00:00.000Z'),
      updatedAt: new Date('2026-07-17T08:00:00.000Z'),
    });
    graph.createTeam.mockRejectedValue(
      new MicrosoftGraphHttpError('forbidden', 403, 'Forbidden', 'forbidden'),
    );

    await expect(service.processProvisioningJob('prov-1')).rejects.toBeInstanceOf(
      MicrosoftGraphHttpError,
    );

    expect(prisma.projectMicrosoftTeamsProvisioning.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          errorCode: 'MICROSOFT_TEAM_CREATE_FORBIDDEN',
        }),
      }),
    );
  });
});
