import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, UnrecoverableError, Worker } from 'bullmq';
import IORedis from 'ioredis';
import {
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_JOB,
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE_NAME,
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_JOB,
  QUEUE_CONNECTION,
} from '../queue/queue.constants';
import type { ProjectMicrosoftTeamsProvisioningJobPayload } from '../queue/queue.service';
import { PROVISIONING_JOB_TIMEOUT_MS } from './project-microsoft-teams-provisioning.constants';
import { ProjectMicrosoftTeamsProvisioningService } from './project-microsoft-teams-provisioning.service';
import { ProjectMicrosoftTeamsProvisioningStaleMaintenanceService } from './project-microsoft-teams-provisioning-stale-maintenance.service';

@Injectable()
export class ProjectMicrosoftTeamsProvisioningProcessor
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    ProjectMicrosoftTeamsProvisioningProcessor.name,
  );
  private worker: Worker | null = null;

  constructor(
    @Inject(QUEUE_CONNECTION) private readonly redis: IORedis,
    private readonly provisioningService: ProjectMicrosoftTeamsProvisioningService,
    private readonly staleMaintenanceService: ProjectMicrosoftTeamsProvisioningStaleMaintenanceService,
  ) {}

  async onModuleInit(): Promise<void> {
    const st = this.redis.status;
    if (st === 'wait' || st === 'end') {
      await this.redis.connect();
    }

    this.worker = new Worker(
      PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE_NAME,
      async (job: Job) => this.dispatchJob(job),
      { connection: this.redis },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `[PROJECT_MS_TEAMS worker] job en échec id=${job?.id} name=${job?.name}: ${error.message}`,
        error.stack,
      );
    });
    this.worker.on('completed', (job) => {
      this.logger.log(
        `[PROJECT_MS_TEAMS worker] terminé job id=${String(job.id)} name=${job.name}`,
      );
    });
  }

  private async dispatchJob(job: Job): Promise<void> {
    if (job.name === PROJECT_MICROSOFT_TEAMS_PROVISIONING_JOB) {
      await this.runProvisioningJob(
        job as Job<ProjectMicrosoftTeamsProvisioningJobPayload>,
      );
      return;
    }

    if (job.name === PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_JOB) {
      await this.staleMaintenanceService.runStaleMaintenance();
      return;
    }

    this.logger.error(
      `[PROJECT_MS_TEAMS worker] job.name inconnu queue=${PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE_NAME} job.name=${job.name} job.id=${String(job.id)}`,
    );
    throw new UnrecoverableError(
      `Job Microsoft Teams provisioning inconnu: ${job.name}`,
    );
  }

  private async runProvisioningJob(
    job: Job<ProjectMicrosoftTeamsProvisioningJobPayload>,
  ): Promise<void> {
    const provisioningId = job.data.provisioningId;
    this.logger.log(
      `[PROJECT_MS_TEAMS worker] traitement job id=${String(job.id)} provisioningId=${provisioningId} attempt=${job.attemptsMade + 1}/${job.opts.attempts ?? 1}`,
    );

    const controller = new AbortController();
    const timeoutMs = PROVISIONING_JOB_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      await this.provisioningService.processProvisioningJob(provisioningId, {
        signal: controller.signal,
        onPollHeartbeat: async () => {
          await this.provisioningService.touchHeartbeatOnly(provisioningId);
        },
      });
    } catch (error) {
      await this.provisioningService.handleProvisioningJobError(job, error);
    } finally {
      clearTimeout(timer);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.worker) return;
    await this.worker.close();
    this.worker = null;
  }
}
