import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { BudgetReportingModule } from '../budget-reporting/budget-reporting.module';
import { BudgetLandingService } from './budget-landing.service';
import { BudgetLandingReadService } from './budget-landing-read.service';
import { BudgetLandingController } from './budget-landing.controller';
import { BudgetLineLandingController } from './budget-line-landing.controller';

@Module({
  imports: [PrismaModule, AuditLogsModule, BudgetReportingModule],
  controllers: [BudgetLandingController, BudgetLineLandingController],
  providers: [BudgetLandingService, BudgetLandingReadService],
  exports: [BudgetLandingService, BudgetLandingReadService],
})
export class BudgetLandingModule {}
