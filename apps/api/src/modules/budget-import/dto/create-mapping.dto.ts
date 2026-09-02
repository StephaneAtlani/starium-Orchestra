import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  BudgetImportEntityType,
  BudgetImportPurpose,
  BudgetImportSourceType,
} from '@prisma/client';
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

  @IsOptional()
  @IsEnum(BudgetImportPurpose)
  importPurpose?: BudgetImportPurpose;

  /** `null` ou string vide = pas de budget par défaut. */
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  defaultBudgetId?: string | null;
}
