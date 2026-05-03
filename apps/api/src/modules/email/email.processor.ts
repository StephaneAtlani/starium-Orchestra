import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_CONNECTION, EMAIL_QUEUE_NAME } from '../queue/queue.constants';
import { EmailService } from './email.service';

@Injectable()
export class EmailProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailProcessor.name);
  private worker: Worker | null = null;

  constructor(
    @Inject(QUEUE_CONNECTION) private readonly redis: IORedis,
    private readonly emailService: EmailService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.redis.connect();
    this.worker = new Worker(
      EMAIL_QUEUE_NAME,
      async (job: Job<{ emailDeliveryId: string }>) => {
        if (job.name !== 'send_email') return;
        const id = job.data.emailDeliveryId;
        this.logger.log(
          `[EMAIL worker] traitement job BullMQ id=${String(job.id)} emailDeliveryId=${id}`,
        );
        try {
          await this.emailService.processEmailDelivery(id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e ?? '');
          this.logger.error(
            `[EMAIL worker] erreur job id=${String(job.id)} emailDeliveryId=${id}: ${msg}`,
            e instanceof Error ? e.stack : undefined,
          );
          throw e;
        }
      },
      { connection: this.redis },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(
        `[EMAIL worker] terminé job id=${String(job.id)} name=${job.name}`,
      );
    });
    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `[EMAIL worker] job définitivement en échec id=${job?.id} emailDeliveryId=${job?.data?.emailDeliveryId}: ${error.message}`,
        error.stack,
      );
    });
    this.logger.log('Email worker started');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }
}
