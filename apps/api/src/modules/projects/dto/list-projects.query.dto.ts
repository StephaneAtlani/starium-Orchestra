import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  ProjectCriticality,
  ProjectPriority,
  ProjectStatus,
} from '@prisma/client';

export class ListProjectsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @IsOptional()
  @IsEnum(ProjectCriticality)
  criticality?: ProjectCriticality;

  @IsOptional()
  @IsIn(['PROJECT', 'ACTIVITY'])
  kind?: 'PROJECT' | 'ACTIVITY';

  @IsOptional()
  @IsString()
  @IsIn([
    'name',
    'targetEndDate',
    'status',
    'priority',
    'criticality',
    'computedHealth',
    'progressPercent',
  ])
  sortBy?: string = 'targetEndDate';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  atRiskOnly?: boolean;
}
