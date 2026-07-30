import {
  IsIn,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { OrgUnitType } from '@prisma/client';
import {
  VISUAL_ACCENT_TOKENS,
  VISUAL_ICON_KEYS,
  VISUAL_SURFACE_TOKENS,
  type VisualAccentToken,
  type VisualIconKey,
  type VisualSurfaceToken,
} from '@starium-orchestra/types';

export class UpdateOrgUnitDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  code?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsIn(VISUAL_ICON_KEYS)
  iconKey?: VisualIconKey | null;

  @IsOptional()
  @IsIn(VISUAL_ACCENT_TOKENS)
  accentToken?: VisualAccentToken | null;

  @IsOptional()
  @IsIn(VISUAL_SURFACE_TOKENS)
  surfaceToken?: VisualSurfaceToken | null;

  @IsOptional()
  @IsEnum(OrgUnitType)
  type?: OrgUnitType;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
