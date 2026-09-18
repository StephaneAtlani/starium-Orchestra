import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProcedureCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  /** Optionnel — dérivé du libellé si absent. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;
}

export class UpdateProcedureCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
