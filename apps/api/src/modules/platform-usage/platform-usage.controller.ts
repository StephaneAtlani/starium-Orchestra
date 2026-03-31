import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformUsageService } from './platform-usage.service';

/**
 * Vue agrégée (comptages) pour le tableau de bord administrateur plateforme.
 */
@Controller('platform/usage-overview')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformUsageController {
  constructor(private readonly usage: PlatformUsageService) {}

  @Get()
  getOverview() {
    return this.usage.getOverview();
  }
}
