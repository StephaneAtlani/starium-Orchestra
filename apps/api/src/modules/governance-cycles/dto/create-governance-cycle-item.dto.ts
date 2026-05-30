import { Type } from 'class-transformer';
import { GovernanceCycleItemSourceType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateGovernanceCycleItemDto {
  @IsEnum(GovernanceCycleItemSourceType)
  sourceType!: GovernanceCycleItemSourceType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  budgetId?: string;

  @IsOptional()
  @IsUUID()
  budgetLineId?: string;

  @IsOptional()
  @IsUUID()
  strategicObjectiveId?: string;

  @IsOptional()
  @IsUUID()
  riskId?: string;

  @IsOptional()
  @IsNumberString()
  estimatedBudgetAmount?: string;

  @IsOptional()
  @IsNumberString()
  estimatedCapacityDays?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  valueScore?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  riskScore?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  budgetScore?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  capacityScore?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  alignmentScore?: number | null;
}
