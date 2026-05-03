import { Module } from '@nestjs/common';
import { AuditLogsCoreModule } from './audit-logs-core.module';
import { AuditLogsController } from './audit-logs.controller';
import { PlatformAuditLogsController } from './platform-audit-logs.controller';

@Module({
  imports: [AuditLogsCoreModule],
  controllers: [AuditLogsController, PlatformAuditLogsController],
  exports: [AuditLogsCoreModule],
})
export class AuditLogsModule {}

