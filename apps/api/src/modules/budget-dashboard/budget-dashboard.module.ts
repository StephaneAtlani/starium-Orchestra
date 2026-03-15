import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BudgetDashboardController } from './budget-dashboard.controller';
import { BudgetDashboardService } from './budget-dashboard.service';

@Module({
  imports: [PrismaModule],
  controllers: [BudgetDashboardController],
  providers: [BudgetDashboardService],
})
export class BudgetDashboardModule {}
