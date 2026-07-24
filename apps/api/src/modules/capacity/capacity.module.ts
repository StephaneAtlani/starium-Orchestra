import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccessDecisionModule } from '../access-decision/access-decision.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CapacityAggregateService } from './capacity-aggregate.service';
import { CapacityAllocationService } from './capacity-allocation.service';
import { CapacityCalendarService } from './capacity-calendar.service';
import { CapacityConsumptionService } from './capacity-consumption.service';
import { CapacityController } from './capacity.controller';
import { CapacityResolveService } from './capacity-resolve.service';
import { CapacitySourceAccessService } from './capacity-source-access.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, AccessDecisionModule, CommonModule],
  controllers: [CapacityController],
  providers: [
    CapacityCalendarService,
    CapacityResolveService,
    CapacityAllocationService,
    CapacityAggregateService,
    CapacityConsumptionService,
    CapacitySourceAccessService,
  ],
  exports: [
    CapacityCalendarService,
    CapacityResolveService,
    CapacityAllocationService,
    CapacityAggregateService,
    CapacityConsumptionService,
    CapacitySourceAccessService,
  ],
})
export class CapacityModule {}
