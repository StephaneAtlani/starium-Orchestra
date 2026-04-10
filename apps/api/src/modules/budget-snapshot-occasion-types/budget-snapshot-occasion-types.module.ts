import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { BudgetSnapshotOccasionTypesService } from './budget-snapshot-occasion-types.service';
import { BudgetSnapshotOccasionTypesController } from './budget-snapshot-occasion-types.controller';
import { PlatformBudgetSnapshotOccasionTypesController } from './platform-budget-snapshot-occasion-types.controller';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [
    BudgetSnapshotOccasionTypesController,
    PlatformBudgetSnapshotOccasionTypesController,
  ],
  providers: [BudgetSnapshotOccasionTypesService, PlatformAdminGuard],
  exports: [BudgetSnapshotOccasionTypesService],
})
export class BudgetSnapshotOccasionTypesModule {}
