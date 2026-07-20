import { QueueService } from './queue.service';
import {
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_JOB,
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_SCHEDULER_ID,
} from './queue.constants';
import { buildProjectMicrosoftTeamsProvisioningJobId } from '../microsoft/project-microsoft-teams-provisioning.constants';

describe('QueueService — provisioning Teams', () => {
  const emailQueue = { add: jest.fn() };
  const licenseQueue = { add: jest.fn() };
  const provisioningQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-x' }),
    upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
  };

  let service: QueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE_BACKOFF_MS;
    service = new QueueService(
      emailQueue as any,
      licenseQueue as any,
      provisioningQueue as any,
    );
  });

  it('buildProjectMicrosoftTeamsProvisioningJobId inclut retryCount', () => {
    expect(buildProjectMicrosoftTeamsProvisioningJobId('prov-1', 2)).toBe(
      'project_ms_teams_provisioning_prov-1_r2',
    );
  });

  it('enqueue provisioning : backoff défaut 30s et jobId _r0', async () => {
    await service.enqueueProjectMicrosoftTeamsProvisioning({ provisioningId: 'prov-1' }, 0);

    expect(provisioningQueue.add).toHaveBeenCalledWith(
      PROJECT_MICROSOFT_TEAMS_PROVISIONING_JOB,
      { provisioningId: 'prov-1' },
      expect.objectContaining({
        backoff: { type: 'exponential', delay: 30000 },
        jobId: 'project_ms_teams_provisioning_prov-1_r0',
        removeOnFail: false,
      }),
    );
  });

  it('ensureStaleMaintenanceScheduler idempotent', async () => {
    await service.ensureStaleMaintenanceScheduler();
    await service.ensureStaleMaintenanceScheduler();

    expect(provisioningQueue.upsertJobScheduler).toHaveBeenCalledTimes(1);
    expect(provisioningQueue.upsertJobScheduler).toHaveBeenCalledWith(
      PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_SCHEDULER_ID,
      expect.objectContaining({ every: 300000 }),
      expect.objectContaining({
        opts: expect.objectContaining({
          attempts: 1,
          removeOnComplete: 1000,
          removeOnFail: 1000,
        }),
      }),
    );
  });
});
