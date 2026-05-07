import { Module } from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { LicenseReportingController } from './license-reporting.controller';
import { LicenseReportingService } from './license-reporting.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LicenseReportingController],
  providers: [LicenseReportingService, PlatformAdminGuard],
  exports: [LicenseReportingService],
})
export class LicenseReportingModule {}
