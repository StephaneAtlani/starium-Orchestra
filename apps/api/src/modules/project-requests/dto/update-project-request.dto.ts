import {
  ProjectRequestPriorityRequested,
  ProjectRequestType,
  ProjectRequestUrgency,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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
  @IsEnum(ProjectRequestType)
  type?: ProjectRequestType | null;

  @IsOptional()
  @IsString()
  portfolioCategoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  requestingDirection?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sponsorLabel?: string | null;

  @IsOptional()
  @IsString()
  sponsorUserId?: string | null;

  @IsOptional()
  @IsString()
  validatorUserId?: string | null;

  @IsOptional()
  @IsEnum(ProjectRequestUrgency)
  urgency?: ProjectRequestUrgency | null;

  @IsOptional()
  @IsEnum(ProjectRequestPriorityRequested)
  priorityRequested?: ProjectRequestPriorityRequested | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedBudget?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedEffortDays?: number | null;

  @IsOptional()
  @IsDateString()
  desiredDeadline?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  objectives?: string[];

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

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  expectedOutcome?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  affectedScope?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  affectedUsersCount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deadlineRationale?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  knownConstraints?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  solutionsTried?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  strategicObjectiveLabel?: string | null;

  @IsOptional()
  @IsObject()
  swot?: {
    strengths?: string;
    weaknesses?: string;
    opportunities?: string;
    threats?: string;
  } | null;

  @IsOptional()
  @IsObject()
  tows?: {
    so?: string;
    wo?: string;
    st?: string;
    wt?: string;
  } | null;

  @IsOptional()
  @IsBoolean()
  budgetUnknown?: boolean;

  @IsOptional()
  @IsBoolean()
  effortUnknown?: boolean;
}
