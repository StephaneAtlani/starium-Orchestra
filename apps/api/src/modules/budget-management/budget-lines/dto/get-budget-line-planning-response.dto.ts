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
  revisedAmount!: number;
  /** Écart prévision totale vs révisé (canonique). */
  planningDelta!: number;
  /** Écart atterrissage projeté vs révisé (canonique). */
  landingVariance!: number;
  /** @deprecated Utiliser `planningDelta` (suppression prévue après fenêtre de transition). */
  deltaVsRevised!: number;
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
