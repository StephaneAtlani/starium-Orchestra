import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SecurityLogsService } from './security-logs.service';
import { SecurityLogsCleanupService } from './security-logs.cleanup.service';

@Module({
  imports: [PrismaModule],
  providers: [SecurityLogsService, SecurityLogsCleanupService],
  exports: [SecurityLogsService],
})
export class SecurityLogsModule {}

