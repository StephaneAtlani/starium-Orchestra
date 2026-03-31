import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BudgetImportEntityType, BudgetImportSourceType } from '@prisma/client';
import type { MappingConfig } from '../types/mapping.types';

export class CreateBudgetImportMappingDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  sourceType!: BudgetImportSourceType;

  @IsOptional()
  entityType?: BudgetImportEntityType;

  @IsOptional()
  @IsString()
  sheetName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  headerRowIndex?: number;

  @IsObject()
  mappingConfig!: MappingConfig;

  @IsOptional()
  @IsObject()
  optionsConfig?: Record<string, unknown>;
}
