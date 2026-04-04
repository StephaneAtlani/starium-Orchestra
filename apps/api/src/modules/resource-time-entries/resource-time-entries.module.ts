import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ResourceTimeEntriesController } from './resource-time-entries.controller';
import { ResourceTimeEntriesService } from './resource-time-entries.service';
import { ResourceTimesheetMonthsController } from './resource-timesheet-months.controller';
import { ResourceTimesheetMonthsModule } from './resource-timesheet-months.module';

@Module({
  imports: [PrismaModule, AuditLogsModule, ResourceTimesheetMonthsModule],
  controllers: [ResourceTimeEntriesController, ResourceTimesheetMonthsController],
  providers: [ResourceTimeEntriesService],
  exports: [ResourceTimeEntriesService, ResourceTimesheetMonthsModule],
})
export class ResourceTimeEntriesModule {}
