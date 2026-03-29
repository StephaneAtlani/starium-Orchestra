import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ProjectTaskPriority, ProjectTaskStatus } from '@prisma/client';

/** Champs triables — alignés sur `ProjectTask` (liste plan). */
export const ACTION_PLAN_TASK_SORT_FIELDS = [
  'name',
  'status',
  'priority',
  'plannedStartDate',
  'plannedEndDate',
  'estimatedHours',
  'ownerUserId',
  'createdAt',
  'sortOrder',
] as const;

export type ActionPlanTaskSortField = (typeof ACTION_PLAN_TASK_SORT_FIELDS)[number];

export class ListActionPlanTasksQueryDto {
  @IsOptional()
  @IsEnum(ProjectTaskStatus)
  status?: ProjectTaskStatus;

  @IsOptional()
  @IsEnum(ProjectTaskPriority)
  priority?: ProjectTaskPriority;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  riskId?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn([...ACTION_PLAN_TASK_SORT_FIELDS])
  sortBy?: ActionPlanTaskSortField;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
