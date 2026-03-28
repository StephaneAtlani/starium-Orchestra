import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ProjectTaskPriority, ProjectTaskStatus } from '@prisma/client';

/** RFC-PLA-001 — création tâche depuis un plan (pas de champs projet-only). */
export class CreateActionPlanTaskDto {
  @IsString()
  @MinLength(1)
  name!: string;

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

  /** Lier la tâche à un projet du même client (optionnel). */
  @IsOptional()
  @IsString()
  projectId?: string | null;

  /** Lier à un risque du même client (règles risk/project appliquées côté service). */
  @IsOptional()
  @IsString()
  riskId?: string | null;

  /** Phase projet (obligatoire d’avoir un `projectId`). */
  @IsOptional()
  @IsString()
  phaseId?: string | null;

  /**
   * Responsable métier — ressource humaine (`Resource` type HUMAN), jamais un `User` direct.
   */
  @IsOptional()
  @IsString()
  responsibleResourceId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000)
  estimatedHours?: number | null;

  /** Étiquettes libres (MVP). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  tags?: string[] | null;
}
