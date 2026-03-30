import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { BudgetReportingModule } from '../budget-reporting/budget-reporting.module';
import { BudgetSnapshotsModule } from '../budget-snapshots/budget-snapshots.module';
import { BudgetVersioningModule } from '../budget-versioning/budget-versioning.module';
import { BudgetForecastController } from './budget-forecast.controller';
import { BudgetComparisonController } from './budget-comparison.controller';
import { BudgetForecastService } from './budget-forecast.service';
import { BudgetComparisonService } from './budget-comparison.service';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    BudgetReportingModule,
    BudgetSnapshotsModule,
    BudgetVersioningModule,
  ],
  controllers: [BudgetForecastController, BudgetComparisonController],
  providers: [BudgetForecastService, BudgetComparisonService],
})
export class BudgetForecastModule {}
