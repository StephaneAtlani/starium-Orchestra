import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job, JobsOptions, Queue } from 'bullmq';
import {
  buildProjectMicrosoftTeamsProvisioningJobId,
} from '../microsoft/project-microsoft-teams-provisioning.constants';
import {
  EMAIL_QUEUE,
  LICENSE_EXPIRATION_QUEUE,
  LICENSE_EXPIRATION_SCAN_JOB,
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_JOB,
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE,
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_JOB,
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_SCHEDULER_ID,
} from './queue.constants';
import { PROVISIONING_STALE_MAINTENANCE_INTERVAL_MS } from '../microsoft/project-microsoft-teams-provisioning.constants';

export type SendEmailJobPayload = {
  emailDeliveryId: string;
  /** Repli si la colonne emailBodyHtml n’est pas encore lue (jobs en file avant migration). */
  mimeHtml?: string | null;
};

export type LicenseExpirationScanJobPayload = {
  windowStartIso: string;
  windowEndIso: string;
};

export type ProjectMicrosoftTeamsProvisioningJobPayload = {
  provisioningId: string;
};

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private staleMaintenanceSchedulerInitialized = false;

  constructor(
    @Inject(EMAIL_QUEUE) private readonly emailQueue: Queue,
    @Inject(LICENSE_EXPIRATION_QUEUE)
    private readonly licenseExpirationQueue: Queue,
    @Inject(PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE)
    private readonly projectMicrosoftTeamsProvisioningQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureStaleMaintenanceScheduler();
  }

  async enqueueSendEmail(payload: SendEmailJobPayload): Promise<void> {
    const attempts = Number(process.env.EMAIL_QUEUE_RETRY_ATTEMPTS ?? '3');
    const backoffMs = Number(process.env.EMAIL_QUEUE_BACKOFF_MS ?? '3000');
    const options: JobsOptions = {
      attempts,
      backoff: {
        type: 'exponential',
        delay: backoffMs,
      },
      removeOnComplete: 1000,
      removeOnFail: 2000,
      jobId: `send_email_${payload.emailDeliveryId}`,
    };

    const job = await this.emailQueue.add('send_email', payload, options);
    this.logger.log(
      `[EMAIL queue] job BullMQ id=${String(job.id)} emailDeliveryId=${payload.emailDeliveryId} (consommé par le worker pnpm start:worker)`,
    );
  }

  async enqueueLicenseExpirationScan(
    payload: LicenseExpirationScanJobPayload,
  ): Promise<void> {
    const attempts = Number(
      process.env.LICENSE_EXPIRATION_QUEUE_RETRY_ATTEMPTS ?? '3',
    );
    const backoffMs = Number(
      process.env.LICENSE_EXPIRATION_QUEUE_BACKOFF_MS ?? '5000',
    );
    const options: JobsOptions = {
      attempts,
      backoff: {
        type: 'exponential',
        delay: backoffMs,
      },
      removeOnComplete: 1000,
      removeOnFail: 2000,
      jobId: `${LICENSE_EXPIRATION_SCAN_JOB}_${payload.windowStartIso.replace(/:/g, '-')}`,
    };

    const job = await this.licenseExpirationQueue.add(
      LICENSE_EXPIRATION_SCAN_JOB,
      payload,
      options,
    );
    this.logger.log(
      `[LICENSE_EXPIRATION queue] job BullMQ id=${String(job.id)} window=${payload.windowStartIso}`,
    );
  }

  private projectMicrosoftTeamsProvisioningJobOptions(
    jobId: string,
  ): JobsOptions {
    const attempts = Number(
      process.env.PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE_RETRY_ATTEMPTS ?? '3',
    );
    const backoffMs = Number(
      process.env.PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE_BACKOFF_MS ?? '30000',
    );
    return {
      attempts,
      backoff: {
        type: 'exponential',
        delay: backoffMs,
      },
      removeOnComplete: 1000,
      removeOnFail: false,
      jobId,
    };
  }

  async enqueueProjectMicrosoftTeamsProvisioning(
    payload: ProjectMicrosoftTeamsProvisioningJobPayload,
    retryCount = 0,
  ): Promise<Job<ProjectMicrosoftTeamsProvisioningJobPayload>> {
    const jobId = buildProjectMicrosoftTeamsProvisioningJobId(
      payload.provisioningId,
      retryCount,
    );
    const job = await this.projectMicrosoftTeamsProvisioningQueue.add(
      PROJECT_MICROSOFT_TEAMS_PROVISIONING_JOB,
      payload,
      this.projectMicrosoftTeamsProvisioningJobOptions(jobId),
    );
    this.logger.log(
      `[PROJECT_MS_TEAMS queue] job BullMQ id=${String(job.id)} provisioningId=${payload.provisioningId} retryCount=${retryCount}`,
    );
    return job as Job<ProjectMicrosoftTeamsProvisioningJobPayload>;
  }

  getProjectMicrosoftTeamsProvisioningQueue(): Queue {
    return this.projectMicrosoftTeamsProvisioningQueue;
  }

  /** Idempotent : un seul scheduler logique pour la maintenance stale. */
  async ensureStaleMaintenanceScheduler(): Promise<void> {
    if (this.staleMaintenanceSchedulerInitialized) {
      return;
    }
    await this.projectMicrosoftTeamsProvisioningQueue.upsertJobScheduler(
      PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_SCHEDULER_ID,
      { every: PROVISIONING_STALE_MAINTENANCE_INTERVAL_MS },
      {
        name: PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_JOB,
        data: {},
        opts: {
          attempts: 1,
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      },
    );
    this.staleMaintenanceSchedulerInitialized = true;
    this.logger.log(
      `[PROJECT_MS_TEAMS queue] scheduler stale maintenance id=${PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_SCHEDULER_ID} every=${PROVISIONING_STALE_MAINTENANCE_INTERVAL_MS}ms`,
    );
  }
}
