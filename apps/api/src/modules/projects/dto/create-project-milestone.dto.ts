import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ProjectMilestoneStatus } from '@prisma/client';

export class CreateProjectMilestoneDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsDateString()
  targetDate!: string;

  @IsOptional()
  @IsDateString()
  actualDate?: string;

  @IsOptional()
  @IsEnum(ProjectMilestoneStatus)
  status?: ProjectMilestoneStatus;
}
