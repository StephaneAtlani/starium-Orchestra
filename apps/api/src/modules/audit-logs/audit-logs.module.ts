import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsController } from './audit-logs.controller';
import { PlatformAuditLogsController } from './platform-audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuditLogsController, PlatformAuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}

