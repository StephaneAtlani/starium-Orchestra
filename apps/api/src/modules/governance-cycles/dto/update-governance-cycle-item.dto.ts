import { Type } from 'class-transformer';
import { GovernanceCycleItemDecisionStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateGovernanceCycleItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string | null;

  @IsOptional()
  @IsEnum(GovernanceCycleItemDecisionStatus)
  decisionStatus?: GovernanceCycleItemDecisionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  decisionReason?: string | null;

  @IsOptional()
  @IsNumberString()
  estimatedBudgetAmount?: string | null;

  @IsOptional()
  @IsNumberString()
  estimatedCapacityDays?: string | null;

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
