import { BudgetLinePlanningMode } from '@prisma/client';

export class BudgetLinePlanningMonthDto {
  /** Index 1–12 (aligné sur le mois d’exercice). */
  monthIndex!: number;
  /** Alias non breaking de `monthIndex`. */
  month!: number;
  amount!: number;
}

export class BudgetLinePlanningScenarioDto {
  mode!: BudgetLinePlanningMode;
  inputJson!: unknown;
  createdAt!: Date;
}

export class GetBudgetLinePlanningResponseDto {
  months!: BudgetLinePlanningMonthDto[];
  /** Libellés courts FR des 12 colonnes (ordre = monthIndex 1..12), alignés sur `exerciseStartDate`. */
  monthColumnLabels!: string[];
  planningMode!: BudgetLinePlanningMode | null;
  planningTotalAmount!: number;
  budgetAmount!: number;
  /** Écart prévision totale vs budget. */
  planningDelta!: number;
  /** Écart atterrissage projeté vs budget. */
  landingVariance!: number;
  /** @deprecated Utiliser `planningDelta`. */
  deltaVsBudget!: number;
  /** @deprecated Utiliser `landingVariance` (suppression prévue après fenêtre de transition). */
  variance!: number;
  consumedAmount!: number;
  committedAmount!: number;
  remainingPlanning!: number;
  landing!: number;
  exerciseStartDate!: Date;
  exerciseEndDate!: Date;
  lastScenario?: BudgetLinePlanningScenarioDto | null;
}
