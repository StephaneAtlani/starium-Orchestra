import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  siret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  vatNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  supplierCategoryId?: string | null;

  /** RFC-ORG-003 — unité organisationnelle propriétaire (nullable). */
  @IsOptional()
  @IsString()
  ownerOrgUnitId?: string | null;
}

