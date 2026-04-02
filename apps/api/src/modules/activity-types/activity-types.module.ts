import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ActivityTypesController } from './activity-types.controller';
import { ActivityTypesService } from './activity-types.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [ActivityTypesController],
  providers: [ActivityTypesService],
  exports: [ActivityTypesService],
})
export class ActivityTypesModule {}
