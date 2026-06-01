import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { GovernanceCycleInstancesController } from './governance-cycle-instances.controller';
import { GovernanceCycleInstancesService } from './governance-cycle-instances.service';
import { GovernanceCyclePropagationService } from './governance-cycle-propagation.service';
import { GovernanceCycleReadinessService } from './governance-cycle-readiness.service';
import { GovernanceCyclesController } from './governance-cycles.controller';
import { GovernanceCyclesService } from './governance-cycles.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [GovernanceCyclesController, GovernanceCycleInstancesController],
  providers: [
    GovernanceCyclesService,
    GovernanceCycleInstancesService,
    GovernanceCycleReadinessService,
    GovernanceCyclePropagationService,
  ],
  exports: [GovernanceCyclesService, GovernanceCycleInstancesService],
})
export class GovernanceCyclesModule {}
