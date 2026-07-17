import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job, JobsOptions, Queue } from 'bullmq';
import {
  EMAIL_QUEUE,
  LICENSE_EXPIRATION_QUEUE,
  LICENSE_EXPIRATION_SCAN_JOB,
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_JOB,
  PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE,
} from './queue.constants';

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
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @Inject(EMAIL_QUEUE) private readonly emailQueue: Queue,
    @Inject(LICENSE_EXPIRATION_QUEUE)
    private readonly licenseExpirationQueue: Queue,
    @Inject(PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE)
    private readonly projectMicrosoftTeamsProvisioningQueue: Queue,
  ) {}

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
      // BullMQ interdit les ":" dans les jobId custom (délimiteur Redis interne).
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
      // BullMQ interdit les ":" dans les jobId custom (délimiteur Redis interne).
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

  async enqueueProjectMicrosoftTeamsProvisioning(
    payload: ProjectMicrosoftTeamsProvisioningJobPayload,
  ): Promise<Job<ProjectMicrosoftTeamsProvisioningJobPayload>> {
    const attempts = Number(
      process.env.PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE_RETRY_ATTEMPTS ?? '3',
    );
    const backoffMs = Number(
      process.env.PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE_BACKOFF_MS ?? '5000',
    );
    const job = await this.projectMicrosoftTeamsProvisioningQueue.add(
      PROJECT_MICROSOFT_TEAMS_PROVISIONING_JOB,
      payload,
      {
        attempts,
        backoff: {
          type: 'exponential',
          delay: backoffMs,
        },
        removeOnComplete: 1000,
        removeOnFail: false,
        jobId: `project_ms_teams_provisioning_${payload.provisioningId}`,
      },
    );
    this.logger.log(
      `[PROJECT_MS_TEAMS queue] job BullMQ id=${String(job.id)} provisioningId=${payload.provisioningId}`,
    );
    return job as Job<ProjectMicrosoftTeamsProvisioningJobPayload>;
  }

  getProjectMicrosoftTeamsProvisioningQueue(): Queue {
    return this.projectMicrosoftTeamsProvisioningQueue;
  }
}
