import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumberString,
} from 'class-validator';
import { BudgetStatus, BudgetTaxMode } from '@prisma/client';
import {
  VISUAL_ACCENT_TOKENS,
  VISUAL_ICON_KEYS,
  VISUAL_SURFACE_TOKENS,
  type VisualAccentToken,
  type VisualIconKey,
  type VisualSurfaceToken,
} from '@starium-orchestra/types';

export class CreateBudgetDto {
  @IsString()
  @IsNotEmpty()
  exerciseId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  currency!: string;

  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  /** RFC-ORG-003 — unité propriétaire (nullable). */
  @IsOptional()
  @IsString()
  ownerOrgUnitId?: string | null;

  @IsOptional()
  @IsString()
  stewardResourceId?: string | null;

  @IsOptional()
  @IsEnum(BudgetTaxMode)
  taxMode?: BudgetTaxMode;

  @IsOptional()
  @IsNumberString()
  defaultTaxRate?: string;

  /** RFC-DS-001 — dérogation visuelle locale (prioritaire sur ownerOrgUnit). */
  @IsOptional()
  @IsIn(VISUAL_ICON_KEYS)
  iconKey?: VisualIconKey | null;

  @IsOptional()
  @IsIn(VISUAL_ACCENT_TOKENS)
  accentToken?: VisualAccentToken | null;

  @IsOptional()
  @IsIn(VISUAL_SURFACE_TOKENS)
  surfaceToken?: VisualSurfaceToken | null;
}
