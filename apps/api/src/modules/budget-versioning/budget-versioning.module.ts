import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { BudgetSnapshotsModule } from '../budget-snapshots/budget-snapshots.module';
import { BudgetVersioningService } from './budget-versioning.service';
import { BudgetVersionSetsController } from './budget-version-sets.controller';
import { BudgetVersioningController } from './budget-versioning.controller';

@Module({
  imports: [PrismaModule, AuditLogsModule, BudgetSnapshotsModule],
  controllers: [BudgetVersionSetsController, BudgetVersioningController],
  providers: [BudgetVersioningService],
  exports: [BudgetVersioningService],
})
export class BudgetVersioningModule {}
