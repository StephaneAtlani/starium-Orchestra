import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { AccessDecisionService } from './access-decision.service';
import { ResourceAccessDecisionGuard } from './resource-access-decision.guard';

@Module({
  imports: [PrismaModule, AccessControlModule],
  providers: [AccessDecisionService, ResourceAccessDecisionGuard],
  exports: [AccessDecisionService, ResourceAccessDecisionGuard],
})
export class AccessDecisionModule {}
