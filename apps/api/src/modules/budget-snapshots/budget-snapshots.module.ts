import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ClientsModule } from '../clients/clients.module';
import { BudgetSnapshotOccasionTypesModule } from '../budget-snapshot-occasion-types/budget-snapshot-occasion-types.module';
import { BudgetSnapshotsController } from './budget-snapshots.controller';
import { BudgetSnapshotsService } from './budget-snapshots.service';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    ClientsModule,
    BudgetSnapshotOccasionTypesModule,
  ],
  controllers: [BudgetSnapshotsController],
  providers: [BudgetSnapshotsService],
  exports: [BudgetSnapshotsService],
})
export class BudgetSnapshotsModule {}
