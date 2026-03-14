import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { FinancialCoreModule } from '../financial-core/financial-core.module';
import { BudgetReallocationController } from './budget-reallocation.controller';
import { BudgetReallocationService } from './budget-reallocation.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, FinancialCoreModule],
  controllers: [BudgetReallocationController],
  providers: [BudgetReallocationService],
})
export class BudgetReallocationModule {}
