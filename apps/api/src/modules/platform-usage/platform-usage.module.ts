import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PlatformUsageController } from './platform-usage.controller';
import { PlatformUsageService } from './platform-usage.service';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PlatformUsageController],
  providers: [PlatformUsageService, PlatformAdminGuard],
})
export class PlatformUsageModule {}
