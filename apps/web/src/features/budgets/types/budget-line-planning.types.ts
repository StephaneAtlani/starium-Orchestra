/**
 * Types frontend alignés sur GetBudgetLinePlanningResponseDto et les DTOs planning backend.
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
  amount: number;
}

export interface BudgetLinePlanningScenario {
  mode: BudgetLinePlanningMode;
  inputJson: unknown;
  createdAt: string;
}

export interface BudgetLinePlanningResponse {
  months: BudgetLinePlanningMonth[];
  planningMode: BudgetLinePlanningMode | null;
  planningTotalAmount: number;
  revisedAmount: number;
  deltaVsRevised: number;
  exerciseStartDate: string;
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

