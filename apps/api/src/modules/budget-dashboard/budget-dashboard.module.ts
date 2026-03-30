import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { BudgetDashboardController } from './budget-dashboard.controller';
import { BudgetDashboardConfigService } from './budget-dashboard-config.service';
import { BudgetDashboardService } from './budget-dashboard.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [BudgetDashboardController],
  providers: [BudgetDashboardService, BudgetDashboardConfigService],
})
export class BudgetDashboardModule {}
