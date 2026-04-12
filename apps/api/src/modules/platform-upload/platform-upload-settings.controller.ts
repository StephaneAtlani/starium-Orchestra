import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { UpdatePlatformUploadSettingsDto } from './dto/update-platform-upload-settings.dto';
import { PlatformUploadSettingsService } from './platform-upload-settings.service';

/**
 * Plafond taille des fichiers métier (import budget, pièces procurement) — scope plateforme.
 */
@Controller('platform/upload-settings')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformUploadSettingsController {
  constructor(private readonly settings: PlatformUploadSettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  patch(@Body() dto: UpdatePlatformUploadSettingsDto) {
    return this.settings.patch(dto);
  }
}
