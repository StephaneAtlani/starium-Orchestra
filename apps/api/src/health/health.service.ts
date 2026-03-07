import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@starium-orchestra/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    let database: HealthResponse['database'] = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'connected';
    } catch {
      database = 'disconnected';
    }
    const status = database === 'connected' ? 'ok' : 'degraded';
    return {
      status,
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
