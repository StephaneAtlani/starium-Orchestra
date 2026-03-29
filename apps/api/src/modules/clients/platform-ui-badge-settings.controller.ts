import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformUiBadgeSettingsService } from './platform-ui-badge-settings.service';

/**
 * Défauts globaux badges UI (tous les clients) — fusionnés avant les surcharges `Client.uiBadgeConfig`.
 * GET : tout utilisateur authentifié (nécessaire au rendu).
 * PATCH : administrateur plateforme uniquement.
 */
@Controller('platform/ui-badge-defaults')
export class PlatformUiBadgeSettingsController {
  constructor(private readonly platform: PlatformUiBadgeSettingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getDefaults() {
    return this.platform.getDefaults();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  updateDefaults(@Body() body: unknown) {
    return this.platform.updateDefaults(body);
  }
}
