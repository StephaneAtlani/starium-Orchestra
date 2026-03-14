import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AllocationType } from '@prisma/client';

export class ListFinancialAllocationsQueryDto {
  @IsOptional()
  @IsString()
  budgetLineId?: string;

  @IsOptional()
  @IsEnum(AllocationType)
  allocationType?: AllocationType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;
}
