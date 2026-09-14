import {
  ProjectRequestInstructionOpinion,
  ProjectRequestPriorityRequested,
  ProjectRequestType,
  ProjectRequestUrgency,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProjectRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsEnum(ProjectRequestType)
  type?: ProjectRequestType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  requestingDirection?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sponsorLabel?: string;

  @IsOptional()
  @IsString()
  sponsorUserId?: string;

  @IsOptional()
  @IsString()
  validatorUserId?: string;

  @IsOptional()
  @IsEnum(ProjectRequestUrgency)
  urgency?: ProjectRequestUrgency;

  @IsOptional()
  @IsEnum(ProjectRequestPriorityRequested)
  priorityRequested?: ProjectRequestPriorityRequested;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedBudget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedEffortDays?: number;

  @IsOptional()
  @IsDateString()
  desiredDeadline?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  objectives?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  expectedBenefits?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  businessContext?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  riskIfNotDone?: string;
}
