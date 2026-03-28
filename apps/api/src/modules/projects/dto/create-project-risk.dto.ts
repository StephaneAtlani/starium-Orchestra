import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  ProjectRiskImpactCategory,
  ProjectRiskStatus,
  ProjectRiskTreatmentStrategy,
  ProjectRiskCriticality,
} from '@prisma/client';

export class CreateProjectRiskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @IsString()
  @MinLength(1)
  title!: string;

  /** Scénario structuré type « Si X alors Y » (RFC-PROJ-018). */
  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsString()
  category?: string;

  /** FK taxonomie — seule source de vérité pour domaine/type affichés. */
  @IsString()
  @MinLength(1)
  riskTypeId!: string;

  @IsString()
  @MinLength(1)
  threatSource!: string;

  @IsString()
  @MinLength(1)
  businessImpact!: string;

  @IsOptional()
  @IsString()
  likelihoodJustification?: string;

  @IsOptional()
  @IsEnum(ProjectRiskImpactCategory)
  impactCategory?: ProjectRiskImpactCategory;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  probability!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  impact!: number;

  @IsOptional()
  @IsString()
  mitigationPlan?: string;

  @IsOptional()
  @IsString()
  contingencyPlan?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsEnum(ProjectRiskStatus)
  status?: ProjectRiskStatus;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  detectedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  complianceRequirementId?: string;

  @IsEnum(ProjectRiskTreatmentStrategy)
  treatmentStrategy!: ProjectRiskTreatmentStrategy;

  @IsOptional()
  @IsEnum(ProjectRiskCriticality)
  residualRiskLevel?: ProjectRiskCriticality;

  @IsOptional()
  @IsString()
  residualJustification?: string;
}
