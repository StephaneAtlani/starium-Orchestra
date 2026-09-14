import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { STRATEGIC_DIRECTION_ACCENT_TONES } from '../../strategic-direction-strategy/dto/strategy-schema-items.dto';

export class CreateStrategicDirectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsIn([...STRATEGIC_DIRECTION_ACCENT_TONES])
  accentTone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  parentLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sponsorResourceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fteCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  operatingBudgetCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStrategicDirectionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsIn([...STRATEGIC_DIRECTION_ACCENT_TONES])
  accentTone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  parentLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sponsorResourceId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fteCount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  operatingBudgetCents?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
