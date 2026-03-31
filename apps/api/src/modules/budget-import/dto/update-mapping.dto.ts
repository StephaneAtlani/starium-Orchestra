import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
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
}
