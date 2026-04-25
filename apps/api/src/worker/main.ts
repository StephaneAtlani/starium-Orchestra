import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const logger = new Logger('WorkerMain');
  logger.log('Email worker started (no HTTP server)');

  const shutdown = async () => {
    logger.log('Stopping worker...');
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

bootstrapWorker();
