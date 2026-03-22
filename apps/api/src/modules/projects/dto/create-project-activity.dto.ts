import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  ProjectActivityFrequency,
  ProjectActivityStatus,
} from '@prisma/client';

export class CreateProjectActivityDto {
  @IsString()
  @MinLength(1)
  sourceTaskId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectActivityStatus)
  status?: ProjectActivityStatus;

  @IsEnum(ProjectActivityFrequency)
  frequency!: ProjectActivityFrequency;

  @IsOptional()
  @IsString()
  customRrule?: string;

  @IsOptional()
  @IsDateString()
  nextExecutionDate?: string;

  @IsOptional()
  @IsDateString()
  lastExecutionDate?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string | null;

  @IsOptional()
  @IsString()
  budgetLineId?: string | null;
}
