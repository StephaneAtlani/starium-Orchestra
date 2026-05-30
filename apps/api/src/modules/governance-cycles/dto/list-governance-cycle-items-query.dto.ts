import { Type } from 'class-transformer';
import {
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemSourceType,
} from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListGovernanceCycleItemsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsEnum(GovernanceCycleItemDecisionStatus)
  decisionStatus?: GovernanceCycleItemDecisionStatus;

  @IsOptional()
  @IsEnum(GovernanceCycleItemSourceType)
  sourceType?: GovernanceCycleItemSourceType;

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
