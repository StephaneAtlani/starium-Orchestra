import { BudgetLinePlanningMode } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, ValidateIf, ValidateNested } from 'class-validator';
import { ApplyAnnualSpreadDto } from './apply-annual-spread.dto';
import { ApplyQuarterlyPlanningDto } from './apply-quarterly-planning.dto';
import { ApplyOneShotPlanningDto } from './apply-one-shot-planning.dto';
import { ApplyGrowthPlanningDto } from './apply-growth-planning.dto';
import { ApplyCalculationPlanningDto } from './apply-calculation-planning.dto';

/**
 * Route unifiée `POST .../planning/apply-mode` (RFC-023).
 * Les routes `POST .../apply-*` restent disponibles (legacy).
 */
export class ApplyBudgetLinePlanningModeDto {
  @IsEnum(BudgetLinePlanningMode)
  @IsNotEmpty()
  mode!: BudgetLinePlanningMode;

  @ValidateIf((o) => o.mode === BudgetLinePlanningMode.ANNUAL_SPREAD)
  @ValidateNested()
  @Type(() => ApplyAnnualSpreadDto)
  annualSpread?: ApplyAnnualSpreadDto;

  @ValidateIf((o) => o.mode === BudgetLinePlanningMode.QUARTERLY_SPREAD)
  @ValidateNested()
  @Type(() => ApplyQuarterlyPlanningDto)
  quarterly?: ApplyQuarterlyPlanningDto;

  @ValidateIf((o) => o.mode === BudgetLinePlanningMode.ONE_SHOT)
  @ValidateNested()
  @Type(() => ApplyOneShotPlanningDto)
  oneShot?: ApplyOneShotPlanningDto;

  @ValidateIf((o) => o.mode === BudgetLinePlanningMode.GROWTH)
  @ValidateNested()
  @Type(() => ApplyGrowthPlanningDto)
  growth?: ApplyGrowthPlanningDto;

  @ValidateIf((o) => o.mode === BudgetLinePlanningMode.CALCULATED)
  @ValidateNested()
  @Type(() => ApplyCalculationPlanningDto)
  calculation?: ApplyCalculationPlanningDto;
}
