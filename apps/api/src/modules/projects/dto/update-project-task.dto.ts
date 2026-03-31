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
  ValidateNested,
} from 'class-validator';
import { ProjectTaskChecklistItemInputDto } from './project-task-checklist-item.dto';
import {
  ProjectTaskDependencyType,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from '@prisma/client';

export class UpdateProjectTaskDto {
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
  responsibleResourceId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000)
  estimatedHours?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  tags?: string[] | null;

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

  @IsOptional()
  @IsString()
  actionPlanId?: string | null;

  @IsOptional()
  @IsString()
  riskId?: string | null;
}
