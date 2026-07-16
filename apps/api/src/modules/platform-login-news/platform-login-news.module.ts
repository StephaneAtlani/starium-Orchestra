import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformLoginNewsController } from './platform-login-news.controller';
import { PlatformLoginNewsService } from './platform-login-news.service';
import { PublicLoginNewsController } from './public-login-news.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformLoginNewsController, PublicLoginNewsController],
  providers: [PlatformAdminGuard, PlatformLoginNewsService],
  exports: [PlatformLoginNewsService],
})
export class PlatformLoginNewsModule {}
