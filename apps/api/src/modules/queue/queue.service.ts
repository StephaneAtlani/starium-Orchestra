import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { EMAIL_QUEUE } from './queue.constants';

export type SendEmailJobPayload = {
  emailDeliveryId: string;
};

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(@Inject(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

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
    };

    const job = await this.emailQueue.add('send_email', payload, options);
    this.logger.log(
      `[EMAIL queue] job BullMQ id=${String(job.id)} emailDeliveryId=${payload.emailDeliveryId} (consommé par le worker pnpm start:worker)`,
    );
  }
}
