import { ProjectMicrosoftTeamsProvisioningStatus } from '@prisma/client';
import { ProjectMicrosoftTeamsProvisioningStaleMaintenanceService } from './project-microsoft-teams-provisioning-stale-maintenance.service';
import {
  ERROR_CODE_QUEUE_JOB_COMPLETED_WITHOUT_RUN_UPDATE,
  ERROR_CODE_QUEUE_JOB_FAILED_ORPHAN,
  ERROR_CODE_QUEUE_JOB_MISSING,
  ERROR_CODE_RECOVERY_REQUIRED,
  ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN,
} from './project-microsoft-teams-provisioning.constants';

describe('ProjectMicrosoftTeamsProvisioningStaleMaintenanceService', () => {
  let service: ProjectMicrosoftTeamsProvisioningStaleMaintenanceService;
  let prisma: any;
  let queueService: any;

  beforeEach(() => {
    prisma = {
      projectMicrosoftTeamsProvisioning: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    queueService = {
      getProjectMicrosoftTeamsProvisioningQueue: jest.fn().mockReturnValue({
        getJob: jest.fn(),
      }),
    };
    service = new ProjectMicrosoftTeamsProvisioningStaleMaintenanceService(
      prisma,
      queueService,
    );
  });

  it('IN_PROGRESS stale sans checkpoint → RECOVERY_REQUIRED', async () => {
    const cutoff = new Date(Date.now() - 20 * 60_000);
    prisma.projectMicrosoftTeamsProvisioning.findMany.mockResolvedValue([
      {
        id: 'run-1',
        clientId: 'c1',
        projectId: 'p1',
        status: ProjectMicrosoftTeamsProvisioningStatus.IN_PROGRESS,
        currentJobId: 'job-1',
        graphCreateRequestedAt: null,
        graphOperationUrl: null,
        microsoftTeamId: null,
        lastHeartbeatAt: new Date(Date.now() - 20 * 60_000),
        updatedAt: cutoff,
      },
    ]);

    const summary = await service.runStaleMaintenance();

    expect(summary.recovered).toBe(1);
    expect(prisma.projectMicrosoftTeamsProvisioning.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ errorCode: ERROR_CODE_RECOVERY_REQUIRED }),
      }),
    );
  });

  it('IN_PROGRESS stale avec checkpoint sans teamId → TEAM_CREATION_OUTCOME_UNKNOWN', async () => {
    prisma.projectMicrosoftTeamsProvisioning.findMany.mockResolvedValue([
      {
        id: 'run-2',
        clientId: 'c1',
        projectId: 'p1',
        status: ProjectMicrosoftTeamsProvisioningStatus.IN_PROGRESS,
        currentJobId: 'job-2',
        graphCreateRequestedAt: new Date(),
        graphOperationUrl: null,
        microsoftTeamId: null,
        lastHeartbeatAt: new Date(Date.now() - 20 * 60_000),
        updatedAt: new Date(),
      },
    ]);

    await service.runStaleMaintenance();

    expect(prisma.projectMicrosoftTeamsProvisioning.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          errorCode: ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN,
        }),
      }),
    );
  });

  it('PENDING stale job completed → QUEUE_JOB_COMPLETED_WITHOUT_RUN_UPDATE', async () => {
    const queue = queueService.getProjectMicrosoftTeamsProvisioningQueue();
    queue.getJob.mockResolvedValue({
      getState: jest.fn().mockResolvedValue('completed'),
    });

    prisma.projectMicrosoftTeamsProvisioning.findMany.mockResolvedValue([
      {
        id: 'run-3',
        clientId: 'c1',
        projectId: 'p1',
        status: ProjectMicrosoftTeamsProvisioningStatus.PENDING,
        currentJobId: 'job-3',
        graphCreateRequestedAt: null,
        graphOperationUrl: null,
        microsoftTeamId: null,
        lastHeartbeatAt: new Date(Date.now() - 20 * 60_000),
        updatedAt: new Date(),
      },
    ]);

    await service.runStaleMaintenance();

    expect(prisma.projectMicrosoftTeamsProvisioning.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          errorCode: ERROR_CODE_QUEUE_JOB_COMPLETED_WITHOUT_RUN_UPDATE,
        }),
      }),
    );
  });

  it('PENDING stale job failed → QUEUE_JOB_FAILED_ORPHAN', async () => {
    const queue = queueService.getProjectMicrosoftTeamsProvisioningQueue();
    queue.getJob.mockResolvedValue({
      getState: jest.fn().mockResolvedValue('failed'),
    });

    prisma.projectMicrosoftTeamsProvisioning.findMany.mockResolvedValue([
      {
        id: 'run-4',
        clientId: 'c1',
        projectId: 'p1',
        status: ProjectMicrosoftTeamsProvisioningStatus.PENDING,
        currentJobId: 'job-4',
        graphCreateRequestedAt: null,
        graphOperationUrl: null,
        microsoftTeamId: null,
        lastHeartbeatAt: new Date(Date.now() - 20 * 60_000),
        updatedAt: new Date(),
      },
    ]);

    await service.runStaleMaintenance();

    expect(prisma.projectMicrosoftTeamsProvisioning.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          errorCode: ERROR_CODE_QUEUE_JOB_FAILED_ORPHAN,
        }),
      }),
    );
  });

  it('PENDING stale job absent → QUEUE_JOB_MISSING', async () => {
    const queue = queueService.getProjectMicrosoftTeamsProvisioningQueue();
    queue.getJob.mockResolvedValue(null);

    prisma.projectMicrosoftTeamsProvisioning.findMany.mockResolvedValue([
      {
        id: 'run-5',
        clientId: 'c1',
        projectId: 'p1',
        status: ProjectMicrosoftTeamsProvisioningStatus.PENDING,
        currentJobId: 'job-missing',
        graphCreateRequestedAt: null,
        graphOperationUrl: null,
        microsoftTeamId: null,
        lastHeartbeatAt: new Date(Date.now() - 20 * 60_000),
        updatedAt: new Date(),
      },
    ]);

    await service.runStaleMaintenance();

    expect(prisma.projectMicrosoftTeamsProvisioning.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ errorCode: ERROR_CODE_QUEUE_JOB_MISSING }),
      }),
    );
  });
});
