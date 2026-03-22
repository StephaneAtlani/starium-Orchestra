import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PlanningFormulaTypeDto {
  QUANTITY_X_UNIT_PRICE = 'QUANTITY_X_UNIT_PRICE',
}

export enum QuantityGrowthTypeDto {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export enum QuantityGrowthFrequencyDto {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export class QuantityGrowthConfigDto {
  @IsNumber()
  @Min(0)
  startValue!: number;

  @IsEnum(QuantityGrowthTypeDto)
  growthType!: QuantityGrowthTypeDto;

  @IsNumber()
  @Min(0)
  growthValue!: number;

  @IsEnum(QuantityGrowthFrequencyDto)
  growthFrequency!: QuantityGrowthFrequencyDto;
}

export class UnitPriceConfigDto {
  @IsNumber()
  @Min(0)
  value!: number;
}

export class CalculatePlanningDto {
  @IsEnum(PlanningFormulaTypeDto)
  formulaType!: PlanningFormulaTypeDto;

  @ValidateNested()
  @Type(() => QuantityGrowthConfigDto)
  quantity!: QuantityGrowthConfigDto;

  @ValidateNested()
  @Type(() => UnitPriceConfigDto)
  unitPrice!: UnitPriceConfigDto;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  activeMonthIndexes!: number[];
}

