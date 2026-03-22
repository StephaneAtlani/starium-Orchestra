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

export class CreateProjectMilestoneDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsDateString()
  targetDate!: string;

  @IsOptional()
  @IsDateString()
  achievedDate?: string;

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
