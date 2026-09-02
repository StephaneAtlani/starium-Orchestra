import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { BudgetImportPurpose } from '@prisma/client';
import type { MappingConfig } from '../types/mapping.types';

export class UpdateBudgetImportMappingDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sheetName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  headerRowIndex?: number;

  @IsOptional()
  @IsObject()
  mappingConfig?: MappingConfig;

  @IsOptional()
  @IsObject()
  optionsConfig?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(BudgetImportPurpose)
  importPurpose?: BudgetImportPurpose;

  /** `null` pour détacher le budget par défaut. */
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  defaultBudgetId?: string | null;
}
