import { UnrecoverableError } from 'bullmq';
import { ProjectMicrosoftTeamsProvisioningProcessor } from './project-microsoft-teams-provisioning.processor';
import {
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_JOB,
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_JOB,
} from '../queue/queue.constants';

describe('ProjectMicrosoftTeamsProvisioningProcessor', () => {
  const provisioningService = {
    processProvisioningJob: jest.fn(),
    handleProvisioningJobError: jest.fn(),
    touchHeartbeatOnly: jest.fn(),
  };
  const staleMaintenanceService = {
    runStaleMaintenance: jest.fn().mockResolvedValue({
      examined: 0,
      ignored: 0,
      recovered: 0,
      errored: 0,
    }),
  };
  const redis = {
    status: 'ready',
    connect: jest.fn(),
  };

  let processor: ProjectMicrosoftTeamsProvisioningProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    processor = new ProjectMicrosoftTeamsProvisioningProcessor(
      redis as any,
      provisioningService as any,
      staleMaintenanceService as any,
    );
    (processor as any).worker = {
      on: jest.fn(),
      close: jest.fn(),
    };
    jest
      .spyOn(processor as any, 'dispatchJob')
      .mockImplementation(async (job: any) => {
      if (job.name === PROJECT_MICROSOFT_TEAMS_PROVISIONING_JOB) {
        return (processor as any).runProvisioningJob(job);
      }
      if (job.name === PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_JOB) {
        return staleMaintenanceService.runStaleMaintenance();
      }
      throw new UnrecoverableError(`Job Microsoft Teams provisioning inconnu: ${job.name}`);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('job.name inconnu → UnrecoverableError sans toucher au provisioning', async () => {
    await expect(
      (processor as any).dispatchJob({ name: 'unknown_job', id: 'j1', data: {} }),
    ).rejects.toBeInstanceOf(UnrecoverableError);
    expect(provisioningService.processProvisioningJob).not.toHaveBeenCalled();
  });

  it('provisioning : clearTimeout appelé après succès', async () => {
    provisioningService.processProvisioningJob.mockResolvedValue(undefined);
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    await (processor as any).runProvisioningJob({
      id: 'job-1',
      data: { provisioningId: 'prov-1' },
      opts: { attempts: 3 },
      attemptsMade: 0,
    });

    expect(provisioningService.processProvisioningJob).toHaveBeenCalledWith(
      'prov-1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('maintenance stale : chemin séparé sans AbortController provisioning', async () => {
    await (processor as any).dispatchJob({
      name: PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_JOB,
      id: 'maint-1',
      data: {},
    });
    expect(staleMaintenanceService.runStaleMaintenance).toHaveBeenCalled();
    expect(provisioningService.processProvisioningJob).not.toHaveBeenCalled();
  });
});
