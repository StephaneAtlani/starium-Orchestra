import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  BudgetImportPurpose,
  BudgetImportSourceType,
} from '@prisma/client';

export class ListBudgetImportMappingsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsEnum(BudgetImportPurpose)
  importPurpose?: BudgetImportPurpose;

  @IsOptional()
  @IsEnum(BudgetImportSourceType)
  sourceType?: BudgetImportSourceType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  defaultBudgetId?: string;
}
