import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformMaxFileInterceptor } from './platform-max-file.interceptor';
import { PlatformUploadSettingsController } from './platform-upload-settings.controller';
import { PlatformUploadSettingsService } from './platform-upload-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformUploadSettingsController],
  providers: [
    PlatformAdminGuard,
    PlatformUploadSettingsService,
    PlatformMaxFileInterceptor,
  ],
  exports: [PlatformUploadSettingsService, PlatformMaxFileInterceptor],
})
export class PlatformUploadModule {}
