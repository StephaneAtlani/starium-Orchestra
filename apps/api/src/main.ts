import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import * as http from 'http';
import { AppModule } from './app.module';

/** Ligne de requête OAuth (GET …?code=…) peut dépassir 16 Ko (défaut Node) → connexion coupée / « invalid response ». */
const DEFAULT_HTTP_MAX_HEADER_SIZE_BYTES = 262144;

async function bootstrap() {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter);
  app.setGlobalPrefix('api');
  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    const existing = req.headers['x-request-id'];
    const requestId =
      typeof existing === 'string' && existing.length > 0 ? existing : randomUUID();
    (req as { requestId?: string }).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  const port = Number(process.env.PORT ?? 3001);
  const maxHeaderSize = Number(
    process.env.HTTP_MAX_HEADER_SIZE_BYTES ?? DEFAULT_HTTP_MAX_HEADER_SIZE_BYTES,
  );
  const server = http.createServer({ maxHeaderSize }, expressApp);
  await new Promise<void>((resolve, reject) => {
    server.listen(port, '0.0.0.0', () => resolve());
    server.on('error', reject);
  });
}

bootstrap();
