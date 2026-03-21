import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ProjectMilestoneStatus } from '@prisma/client';

export class UpdateProjectMilestoneDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsDateString()
  actualDate?: string;

  @IsOptional()
  @IsEnum(ProjectMilestoneStatus)
  status?: ProjectMilestoneStatus;
}
