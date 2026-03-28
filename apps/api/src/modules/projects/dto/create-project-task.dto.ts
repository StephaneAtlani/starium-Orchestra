import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProjectTaskChecklistItemInputDto } from './project-task-checklist-item.dto';
import {
  ProjectTaskDependencyType,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from '@prisma/client';

export class CreateProjectTaskDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  code?: string;

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
  plannedStartDate?: string;

  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;

  @IsOptional()
  @IsDateString()
  actualStartDate?: string;

  @IsOptional()
  @IsDateString()
  actualEndDate?: string;

  @IsOptional()
  @IsString()
  phaseId?: string | null;

  @IsOptional()
  @IsString()
  dependsOnTaskId?: string | null;

  @IsOptional()
  @IsEnum(ProjectTaskDependencyType)
  dependencyType?: ProjectTaskDependencyType | null;

  @IsOptional()
  @IsString()
  ownerUserId?: string | null;

  @IsOptional()
  @IsString()
  budgetLineId?: string | null;

  @IsOptional()
  @IsString()
  bucketId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ProjectTaskChecklistItemInputDto)
  checklistItems?: ProjectTaskChecklistItemInputDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  taskLabelIds?: string[];

  /** RFC-PLA-001 — rattacher à un plan d’actions (même client). */
  @IsOptional()
  @IsString()
  actionPlanId?: string | null;

  /** RFC-PLA-001 — lien risque (règles projectId / risk.projectId côté service). */
  @IsOptional()
  @IsString()
  riskId?: string | null;
}
