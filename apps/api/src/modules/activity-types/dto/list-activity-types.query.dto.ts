import { Transform } from 'class-transformer';
import { ActivityTaxonomyKind } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function parseBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}

export class ListActivityTypesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsEnum(ActivityTaxonomyKind)
  kind?: ActivityTaxonomyKind;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  includeArchived?: boolean = false;

  /** Lignes « défaut » par axe taxonomique (RFC-TEAM-006) — utile saisie temps sans charger tout le référentiel. */
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  defaultsOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
