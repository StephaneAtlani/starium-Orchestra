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

  /** Sous-catégorie portefeuille (niveau 2), même référentiel que les projets. */
  @IsOptional()
  @IsString()
  portfolioCategoryId?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  expectedOutcome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  affectedScope?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  affectedUsersCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deadlineRationale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  knownConstraints?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  solutionsTried?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  strategicObjectiveLabel?: string;

  @IsOptional()
  @IsObject()
  swot?: {
    strengths?: string;
    weaknesses?: string;
    opportunities?: string;
    threats?: string;
  };

  @IsOptional()
  @IsObject()
  tows?: {
    so?: string;
    wo?: string;
    st?: string;
    wt?: string;
  };

  @IsOptional()
  @IsBoolean()
  budgetUnknown?: boolean;

  @IsOptional()
  @IsBoolean()
  effortUnknown?: boolean;
}
