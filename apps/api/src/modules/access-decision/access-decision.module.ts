import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { AccessDecisionService } from './access-decision.service';
import { ResourceAccessDecisionGuard } from './resource-access-decision.guard';

@Module({
  imports: [PrismaModule, CommonModule, AccessControlModule],
  providers: [AccessDecisionService, ResourceAccessDecisionGuard],
  exports: [AccessDecisionService, ResourceAccessDecisionGuard],
})
export class AccessDecisionModule {}
