import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { BudgetLineCalculatorService } from './budget-line-calculator.service';
import { FinancialAllocationsController } from './allocations/financial-allocations.controller';
import { FinancialAllocationsService } from './allocations/financial-allocations.service';
import { FinancialEventsController } from './events/financial-events.controller';
import { FinancialEventsService } from './events/financial-events.service';
import { BudgetLinesController } from './budget-lines.controller';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [
    FinancialAllocationsController,
    FinancialEventsController,
    BudgetLinesController,
  ],
  providers: [
    BudgetLineCalculatorService,
    FinancialAllocationsService,
    FinancialEventsService,
  ],
})
export class FinancialCoreModule {}
