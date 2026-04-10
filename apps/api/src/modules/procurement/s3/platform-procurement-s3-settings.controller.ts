import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../../common/guards/platform-admin.guard';
import { PlatformProcurementS3SettingsService } from './platform-procurement-s3-settings.service';
import { UpdatePlatformProcurementS3SettingsDto } from './dto/update-platform-procurement-s3-settings.dto';

/**
 * Configuration S3/MinIO pour la GED procurement (RFC-034). Scope plateforme — pas de client actif.
 */
@Controller('platform/procurement-s3-settings')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformProcurementS3SettingsController {
  constructor(private readonly settings: PlatformProcurementS3SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  patch(@Body() dto: UpdatePlatformProcurementS3SettingsDto) {
    return this.settings.patch(dto);
  }
}
