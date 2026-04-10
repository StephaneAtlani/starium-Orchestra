import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBudgetSnapshotDto {
  @IsString()
  @IsNotEmpty()
  budgetId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsISO8601()
  snapshotDate?: string;

  /** Référentiel RFC-033 — optionnel */
  @IsOptional()
  @IsString()
  occasionTypeId?: string;
}
