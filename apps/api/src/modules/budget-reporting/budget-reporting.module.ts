import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BudgetReportingController } from './budget-reporting.controller';
import { BudgetReportingService } from './budget-reporting.service';

@Module({
  imports: [PrismaModule],
  controllers: [BudgetReportingController],
  providers: [BudgetReportingService],
  exports: [BudgetReportingService],
})
export class BudgetReportingModule {}
