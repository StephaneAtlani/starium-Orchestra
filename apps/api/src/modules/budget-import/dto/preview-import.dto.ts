import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BudgetImportOptionsConfig,
  MappingConfig,
} from '../types/mapping.types';

export class PreviewImportOptionsDto implements BudgetImportOptionsConfig {
  @IsOptional()
  @IsString()
  defaultEnvelopeId?: string;

  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @IsOptional()
  importMode?: 'CREATE_ONLY' | 'UPSERT' | 'UPDATE_ONLY';

  @IsOptional()
  ignoreEmptyRows?: boolean;

  @IsOptional()
  trimValues?: boolean;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  decimalSeparator?: ',' | '.';
}

export class PreviewImportDto {
  @IsString()
  @IsNotEmpty()
  budgetId!: string;

  @IsString()
  @IsNotEmpty()
  fileToken!: string;

  /** Onglet Excel à importer (si absent : premier onglet, comportement parseur). */
  @IsOptional()
  @IsString()
  sheetName?: string;

  @IsObject()
  mapping!: MappingConfig;

  @IsOptional()
  @ValidateNested()
  @Type(() => PreviewImportOptionsDto)
  options?: PreviewImportOptionsDto;
}
