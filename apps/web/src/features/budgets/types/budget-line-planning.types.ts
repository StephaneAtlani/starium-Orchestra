/**
 * Types alignés sur GetBudgetLinePlanningResponseDto (RFC-023).
 */

export type BudgetLinePlanningMode =
  | 'MANUAL'
  | 'ANNUAL_SPREAD'
  | 'QUARTERLY_SPREAD'
  | 'ONE_SHOT'
  | 'GROWTH'
  | 'CALCULATED';

export interface BudgetLinePlanningMonth {
  monthIndex: number;
  /** Alias de monthIndex (API GET/PUT planning). */
  month?: number;
  amount: number;
}

export interface BudgetLinePlanningScenario {
  mode: BudgetLinePlanningMode;
  inputJson: unknown;
  createdAt: string;
}

export interface BudgetLinePlanningResponse {
  months: BudgetLinePlanningMonth[];
  /** Libellés courts des 12 colonnes (alignés sur le début d’exercice). */
  monthColumnLabels: string[];
  planningMode: BudgetLinePlanningMode | null;
  planningTotalAmount: number;
  revisedAmount: number;
  /** Écart somme prévision 12 mois vs révisé. */
  planningDelta: number;
  /** Écart atterrissage projeté vs révisé (pilotage DAF). */
  landingVariance: number;
  /** @deprecated Utiliser `planningDelta`. */
  deltaVsRevised: number;
  /** @deprecated Utiliser `landingVariance`. */
  variance: number;
  consumedAmount: number;
  committedAmount: number;
  remainingPlanning: number;
  landing: number;
  exerciseStartDate: string;
  exerciseEndDate: string;
  lastScenario?: BudgetLinePlanningScenario | null;
}

export interface ApplyAnnualSpreadPayload {
  annualAmount: number;
  activeMonthIndexes: number[];
}

export interface QuarterlyAmountPayload {
  quarter: 1 | 2 | 3 | 4;
  amount: number;
}

export interface ApplyQuarterlyPlanningPayload {
  quarters: QuarterlyAmountPayload[];
}

export interface ApplyOneShotPlanningPayload {
  monthIndex: number;
  amount: number;
}

export type GrowthType = 'PERCENT' | 'FIXED';
export type GrowthFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface ApplyGrowthPlanningPayload {
  baseAmount: number;
  growthType: GrowthType;
  growthValue: number;
  growthFrequency: GrowthFrequency;
  activeMonthIndexes: number[];
}

export type PlanningFormulaType = 'QUANTITY_X_UNIT_PRICE';
export type QuantityGrowthType = 'PERCENT' | 'FIXED';
export type QuantityGrowthFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface QuantityGrowthConfig {
  startValue: number;
  growthType: QuantityGrowthType;
  growthValue: number;
  growthFrequency: QuantityGrowthFrequency;
}

export interface UnitPriceConfig {
  value: number;
}

export interface CalculatePlanningPayloadBase {
  formulaType: PlanningFormulaType;
  quantity: QuantityGrowthConfig;
  unitPrice: UnitPriceConfig;
  activeMonthIndexes: number[];
}

export type CalculatePlanningPayload = CalculatePlanningPayloadBase;

export type ApplyCalculationPlanningPayload = CalculatePlanningPayloadBase;

export interface CalculatePlanningPreviewResponse {
  previewMonths: BudgetLinePlanningMonth[];
  previewTotalAmount: number;
}

export interface ApplyBudgetLinePlanningModePayload {
  mode: BudgetLinePlanningMode;
  annualSpread?: ApplyAnnualSpreadPayload;
  quarterly?: ApplyQuarterlyPlanningPayload;
  oneShot?: ApplyOneShotPlanningPayload;
  growth?: ApplyGrowthPlanningPayload;
  calculation?: ApplyCalculationPlanningPayload;
}
