import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@starium-orchestra/types';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async get(): Promise<HealthResponse> {
    return this.health.check();
  }
}
