import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ClientsModule } from '../clients/clients.module';
import { BudgetSnapshotsModule } from '../budget-snapshots/budget-snapshots.module';
import { BudgetExercisesController } from './budget-exercises/budget-exercises.controller';
import { BudgetExercisesService } from './budget-exercises/budget-exercises.service';
import { BudgetsController } from './budgets/budgets.controller';
import { BudgetsService } from './budgets/budgets.service';
import { BudgetEnvelopesController } from './budget-envelopes/budget-envelopes.controller';
import { BudgetEnvelopesService } from './budget-envelopes/budget-envelopes.service';
import { BudgetLinesController } from './budget-lines/budget-lines.controller';
import { BudgetLinesService } from './budget-lines/budget-lines.service';
import { BudgetLinePlanningController } from './budget-lines/budget-line-planning.controller';
import { BudgetLinePlanningService } from './budget-lines/budget-line-planning.service';
import { GeneralLedgerAccountsController } from './general-ledger-accounts/general-ledger-accounts.controller';
import { GeneralLedgerAccountsService } from './general-ledger-accounts/general-ledger-accounts.service';
import { AnalyticalLedgerAccountsController } from './analytical-ledger-accounts/analytical-ledger-accounts.controller';
import { AnalyticalLedgerAccountsService } from './analytical-ledger-accounts/analytical-ledger-accounts.service';
import { CostCentersController } from './cost-centers/cost-centers.controller';
import { CostCentersService } from './cost-centers/cost-centers.service';
import { BudgetDecisionHistoryService } from './budget-decision-history.service';
import { AccessControlModule } from '../access-control/access-control.module';
import { AccessDecisionModule } from '../access-decision/access-decision.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    ClientsModule,
    BudgetSnapshotsModule,
    AccessControlModule,
    AccessDecisionModule,
    FeatureFlagsModule,
    OrganizationModule,
  ],
  controllers: [
    BudgetExercisesController,
    BudgetsController,
    BudgetEnvelopesController,
    BudgetLinesController,
    BudgetLinePlanningController,
    GeneralLedgerAccountsController,
    AnalyticalLedgerAccountsController,
    CostCentersController,
  ],
  providers: [
    BudgetExercisesService,
    BudgetsService,
    BudgetEnvelopesService,
    BudgetLinesService,
    BudgetLinePlanningService,
    GeneralLedgerAccountsService,
    AnalyticalLedgerAccountsService,
    CostCentersService,
    BudgetDecisionHistoryService,
  ],
})
export class BudgetManagementModule {}
