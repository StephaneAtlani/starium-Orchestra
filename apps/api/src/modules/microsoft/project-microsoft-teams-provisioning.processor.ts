import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import {
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_JOB,
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE_NAME,
  QUEUE_CONNECTION,
} from '../queue/queue.constants';
import type { ProjectMicrosoftTeamsProvisioningJobPayload } from '../queue/queue.service';
import { ProjectMicrosoftTeamsProvisioningService } from './project-microsoft-teams-provisioning.service';

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
  ) {}

  async onModuleInit(): Promise<void> {
    const st = this.redis.status;
    if (st === 'wait' || st === 'end') {
      await this.redis.connect();
    }

    this.worker = new Worker(
      PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE_NAME,
      async (job: Job<ProjectMicrosoftTeamsProvisioningJobPayload>) => {
        if (job.name !== PROJECT_MICROSOFT_TEAMS_PROVISIONING_JOB) return;
        this.logger.log(
          `[PROJECT_MS_TEAMS worker] traitement job id=${String(job.id)} provisioningId=${job.data.provisioningId}`,
        );
        await this.provisioningService.processProvisioningJob(
          job.data.provisioningId,
        );
      },
      { connection: this.redis },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `[PROJECT_MS_TEAMS worker] job en échec id=${job?.id} provisioningId=${job?.data?.provisioningId}: ${error.message}`,
        error.stack,
      );
    });
    this.worker.on('completed', (job) => {
      this.logger.log(
        `[PROJECT_MS_TEAMS worker] terminé job id=${String(job.id)} provisioningId=${job.data.provisioningId}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.worker) return;
    await this.worker.close();
    this.worker = null;
  }
}
