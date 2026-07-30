import {
  IsIn,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VISUAL_ACCENT_TOKENS, VISUAL_ICON_KEYS } from '@starium-orchestra/types';

export class UpdateProjectPortfolioCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MinLength(1)
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  slug?: string | null;

  @IsOptional()
  @IsIn(VISUAL_ACCENT_TOKENS)
  @MaxLength(32)
  color?: string | null;

  @IsOptional()
  @IsIn(VISUAL_ICON_KEYS)
  @MaxLength(64)
  icon?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
