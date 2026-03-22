import { BudgetLinePlanningMode } from '@prisma/client';

export class BudgetLinePlanningMonthDto {
  monthIndex!: number;
  amount!: number;
}

export class BudgetLinePlanningScenarioDto {
  mode!: BudgetLinePlanningMode;
  inputJson!: unknown;
  createdAt!: Date;
}

export class GetBudgetLinePlanningResponseDto {
  months!: BudgetLinePlanningMonthDto[];
  planningMode!: BudgetLinePlanningMode | null;
  planningTotalAmount!: number;
  revisedAmount!: number;
  deltaVsRevised!: number;
  exerciseStartDate!: Date;
  lastScenario?: BudgetLinePlanningScenarioDto | null;
}

