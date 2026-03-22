import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ProjectMilestoneStatus } from '@prisma/client';

export class UpdateProjectMilestoneDto {
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
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsDateString()
  achievedDate?: string | null;

  @IsOptional()
  @IsEnum(ProjectMilestoneStatus)
  status?: ProjectMilestoneStatus;

  @IsOptional()
  @IsString()
  linkedTaskId?: string | null;

  @IsOptional()
  @IsString()
  ownerUserId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
