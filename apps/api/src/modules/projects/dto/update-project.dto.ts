import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  ProjectCopilRecommendation,
  ProjectCriticality,
  ProjectPriority,
  ProjectStatus,
  ProjectType,
} from '@prisma/client';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['PROJECT', 'ACTIVITY'])
  kind?: 'PROJECT' | 'ACTIVITY';

  @IsOptional()
  @IsEnum(ProjectType)
  type?: ProjectType;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @IsOptional()
  @IsString()
  sponsorUserId?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  portfolioCategoryId?: string | null;

  /** RFC-ORG-003 — unité organisationnelle propriétaire (nullable). */
  @IsOptional()
  @IsString()
  ownerOrgUnitId?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  targetEndDate?: string;

  @IsOptional()
  @IsDateString()
  actualEndDate?: string;

  @IsOptional()
  @IsEnum(ProjectCriticality)
  criticality?: ProjectCriticality;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  targetBudgetAmount?: number;

  @IsOptional()
  @IsString()
  pilotNotes?: string;

  /** Fiche projet — recommandation COPIL/COPRO (acceptée aussi sur PATCH /projects/:id pour alignement clients). */
  @IsOptional()
  @IsEnum(ProjectCopilRecommendation)
  copilRecommendation?: ProjectCopilRecommendation;
}
