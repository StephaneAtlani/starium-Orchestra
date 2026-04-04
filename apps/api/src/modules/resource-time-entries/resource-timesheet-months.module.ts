import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ResourceTimesheetMonthsService } from './resource-timesheet-months.service';

@Module({
  imports: [PrismaModule],
  providers: [ResourceTimesheetMonthsService],
  exports: [ResourceTimesheetMonthsService],
})
export class ResourceTimesheetMonthsModule {}
