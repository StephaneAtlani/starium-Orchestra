import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  BudgetImportOptionsConfig,
  MappingConfig,
} from '../types/mapping.types';

export class ExecuteImportOptionsDto implements BudgetImportOptionsConfig {
  @IsOptional()
  @IsString()
  defaultEnvelopeId?: string;

  @IsOptional()
  @IsString()
  defaultGeneralLedgerAccountId?: string;

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

export class ExecuteImportDto {
  @IsString()
  @IsNotEmpty()
  budgetId!: string;

  @IsString()
  @IsNotEmpty()
  fileToken!: string;

  /** Onglet Excel à importer (si absent : premier onglet). */
  @IsOptional()
  @IsString()
  sheetName?: string;

  @IsOptional()
  @IsString()
  mappingId?: string;

  @IsObject()
  mapping!: MappingConfig;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExecuteImportOptionsDto)
  options?: ExecuteImportOptionsDto;
}
