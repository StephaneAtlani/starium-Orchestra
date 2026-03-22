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

export class UpdateProjectActivityDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(ProjectActivityStatus)
  status?: ProjectActivityStatus;

  @IsOptional()
  @IsEnum(ProjectActivityFrequency)
  frequency?: ProjectActivityFrequency;

  @IsOptional()
  @IsString()
  customRrule?: string | null;

  @IsOptional()
  @IsDateString()
  nextExecutionDate?: string | null;

  @IsOptional()
  @IsDateString()
  lastExecutionDate?: string | null;

  @IsOptional()
  @IsString()
  ownerUserId?: string | null;

  @IsOptional()
  @IsString()
  budgetLineId?: string | null;
}
