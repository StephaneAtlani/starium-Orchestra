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
import { ProjectTaskPriority, ProjectTaskStatus } from '@prisma/client';

/** RFC-PLA-001 — mise à jour tâche depuis le contexte plan (pas de champs projet-only). */
export class UpdateActionPlanTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  code?: string | null;

  @IsOptional()
  @IsEnum(ProjectTaskStatus)
  status?: ProjectTaskStatus;

  @IsOptional()
  @IsEnum(ProjectTaskPriority)
  priority?: ProjectTaskPriority;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsDateString()
  plannedStartDate?: string | null;

  @IsOptional()
  @IsDateString()
  plannedEndDate?: string | null;

  @IsOptional()
  @IsDateString()
  actualStartDate?: string | null;

  @IsOptional()
  @IsDateString()
  actualEndDate?: string | null;

  @IsOptional()
  @IsString()
  ownerUserId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  projectId?: string | null;

  @IsOptional()
  @IsString()
  riskId?: string | null;
}
