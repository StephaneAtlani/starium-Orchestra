import { Type } from 'class-transformer';
import {
  GovernanceCycleCadence,
  GovernanceCycleStatus,
} from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListGovernanceCyclesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsEnum(GovernanceCycleStatus)
  status?: GovernanceCycleStatus;

  @IsOptional()
  @IsEnum(GovernanceCycleCadence)
  cadence?: GovernanceCycleCadence;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeArchived?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
