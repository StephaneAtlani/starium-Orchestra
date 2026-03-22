import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  ProjectActivityFrequency,
  ProjectActivityStatus,
} from '@prisma/client';

export class ListProjectActivitiesQueryDto {
  @IsOptional()
  @IsEnum(ProjectActivityStatus)
  status?: ProjectActivityStatus;

  @IsOptional()
  @IsEnum(ProjectActivityFrequency)
  frequency?: ProjectActivityFrequency;

  @IsOptional()
  @IsString()
  sourceTaskId?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

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
  limit?: number = 20;
}
