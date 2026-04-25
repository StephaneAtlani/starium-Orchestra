import { Global, Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import {
  EMAIL_QUEUE,
  EMAIL_QUEUE_NAME,
  QUEUE_CONNECTION,
} from './queue.constants';
import { QueueService } from './queue.service';

@Global()
@Module({
  providers: [
    {
      provide: QUEUE_CONNECTION,
      useFactory: () => {
        const host = process.env.REDIS_HOST?.trim() || '127.0.0.1';
        const port = Number(process.env.REDIS_PORT ?? '6379');
        const password = process.env.REDIS_PASSWORD?.trim() || undefined;

        return new IORedis({
          host,
          port,
          password,
          maxRetriesPerRequest: null,
          lazyConnect: true,
        });
      },
    },
    {
      provide: EMAIL_QUEUE,
      inject: [QUEUE_CONNECTION],
      useFactory: (connection: IORedis) =>
        new Queue(EMAIL_QUEUE_NAME, {
          connection,
        }),
    },
    QueueService,
  ],
  exports: [QUEUE_CONNECTION, EMAIL_QUEUE, QueueService],
})
export class QueueModule {}
