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
        await this.emailService.processEmailDelivery(job.data.emailDeliveryId);
      },
      { connection: this.redis },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Email job completed: ${job.id}`);
    });
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Email job failed: ${job?.id} (${error.message})`);
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
