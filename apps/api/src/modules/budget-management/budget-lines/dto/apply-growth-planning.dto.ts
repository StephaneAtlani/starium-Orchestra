import { IsArray, ArrayNotEmpty, IsEnum, IsInt, IsNumber, Max, Min } from 'class-validator';

export enum GrowthTypeDto {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export enum GrowthFrequencyDto {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export class ApplyGrowthPlanningDto {
  @IsNumber()
  @Min(0)
  baseAmount!: number;

  @IsEnum(GrowthTypeDto)
  growthType!: GrowthTypeDto;

  @IsNumber()
  @Min(0)
  growthValue!: number;

  @IsEnum(GrowthFrequencyDto)
  growthFrequency!: GrowthFrequencyDto;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  activeMonthIndexes!: number[];
}

