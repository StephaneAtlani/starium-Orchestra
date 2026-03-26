import { IsHexColor, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateSupplierCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string | null;

  @IsOptional()
  @IsString()
  @IsHexColor()
  color?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
