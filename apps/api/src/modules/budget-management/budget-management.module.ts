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

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [
    BudgetExercisesController,
    BudgetsController,
    BudgetEnvelopesController,
    BudgetLinesController,
  ],
  providers: [
    BudgetExercisesService,
    BudgetsService,
    BudgetEnvelopesService,
    BudgetLinesService,
  ],
})
export class BudgetManagementModule {}
