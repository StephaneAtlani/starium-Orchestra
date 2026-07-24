import { CapacityAllocationSourceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export class ListAllocationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Matches(YEAR_MONTH, { message: 'yearMonthFrom must be YYYY-MM' })
  yearMonthFrom?: string;

  @IsOptional()
  @Matches(YEAR_MONTH, { message: 'yearMonthTo must be YYYY-MM' })
  yearMonthTo?: string;

  @IsOptional()
  @IsString()
  workTeamId?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsEnum(CapacityAllocationSourceType)
  sourceType?: CapacityAllocationSourceType;

  @IsOptional()
  @IsString()
  sourceId?: string;
}
