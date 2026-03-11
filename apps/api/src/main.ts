import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const existing = req.headers['x-request-id'];
    const requestId =
      typeof existing === 'string' && existing.length > 0 ? existing : randomUUID();
    (req as any).requestId = requestId;
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
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
