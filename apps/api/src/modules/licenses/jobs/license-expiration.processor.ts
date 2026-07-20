import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import {
  LICENSE_EXPIRATION_QUEUE_NAME,
  LICENSE_EXPIRATION_SCAN_JOB,
  QUEUE_CONNECTION,
} from '../../queue/queue.constants';
import {
  LicenseExpirationRunnerService,
  type LicenseExpirationScanJobPayload,
} from './license-expiration-runner.service';

@Injectable()
export class LicenseExpirationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LicenseExpirationProcessor.name);
  private worker: Worker | null = null;
  /** Connexion dédiée : Worker BullMQ = commandes bloquantes, ne doit pas partager l'IORedis des Queue. */
  private workerConnection: IORedis | null = null;

  constructor(
    @Inject(QUEUE_CONNECTION) private readonly redis: IORedis,
    private readonly runner: LicenseExpirationRunnerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const st = this.redis.status;
    if (st === 'wait' || st === 'end') {
      await this.redis.connect();
    }

    // duplicate() obligatoire — sinon Missing lock / moveToFinished (BRPOPLPUSH vs Queue).
    this.workerConnection = this.redis.duplicate();
    const wc = this.workerConnection.status;
    if (wc === 'wait' || wc === 'end') {
      await this.workerConnection.connect();
    }

    this.worker = new Worker(
      LICENSE_EXPIRATION_QUEUE_NAME,
      async (job: Job<LicenseExpirationScanJobPayload>) => {
        if (job.name !== LICENSE_EXPIRATION_SCAN_JOB) return;
        this.logger.log(
          `[LICENSE_EXPIRATION worker] traitement job id=${String(job.id)} window=${job.data.windowStartIso}`,
        );
        await this.runner.runScan(job.data);
      },
      { connection: this.workerConnection },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `[LICENSE_EXPIRATION worker] job en échec id=${job?.id} window=${job?.data?.windowStartIso}: ${error.message}`,
        error.stack,
      );
    });
    this.logger.log('License expiration worker started');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    if (this.workerConnection) {
      await this.workerConnection.quit();
      this.workerConnection = null;
    }
  }
}
