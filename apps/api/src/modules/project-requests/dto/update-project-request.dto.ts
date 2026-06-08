import { ProjectRequestUrgency } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProjectRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsString()
  validatorUserId?: string | null;

  @IsOptional()
  @IsEnum(ProjectRequestUrgency)
  urgency?: ProjectRequestUrgency | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedBudget?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  expectedBenefits?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  businessContext?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  riskIfNotDone?: string | null;
}
