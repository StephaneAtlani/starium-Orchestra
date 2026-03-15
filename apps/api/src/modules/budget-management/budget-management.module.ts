import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { BudgetExercisesController } from './budget-exercises/budget-exercises.controller';
import { BudgetExercisesService } from './budget-exercises/budget-exercises.service';
import { BudgetsController } from './budgets/budgets.controller';
import { BudgetsService } from './budgets/budgets.service';
import { BudgetEnvelopesController } from './budget-envelopes/budget-envelopes.controller';
import { BudgetEnvelopesService } from './budget-envelopes/budget-envelopes.service';
import { BudgetLinesController } from './budget-lines/budget-lines.controller';
import { BudgetLinesService } from './budget-lines/budget-lines.service';
import { GeneralLedgerAccountsController } from './general-ledger-accounts/general-ledger-accounts.controller';
import { GeneralLedgerAccountsService } from './general-ledger-accounts/general-ledger-accounts.service';
import { AnalyticalLedgerAccountsController } from './analytical-ledger-accounts/analytical-ledger-accounts.controller';
import { AnalyticalLedgerAccountsService } from './analytical-ledger-accounts/analytical-ledger-accounts.service';
import { CostCentersController } from './cost-centers/cost-centers.controller';
import { CostCentersService } from './cost-centers/cost-centers.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [
    BudgetExercisesController,
    BudgetsController,
    BudgetEnvelopesController,
    BudgetLinesController,
    GeneralLedgerAccountsController,
    AnalyticalLedgerAccountsController,
    CostCentersController,
  ],
  providers: [
    BudgetExercisesService,
    BudgetsService,
    BudgetEnvelopesService,
    BudgetLinesService,
    GeneralLedgerAccountsService,
    AnalyticalLedgerAccountsService,
    CostCentersService,
  ],
})
export class BudgetManagementModule {}
