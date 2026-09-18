import { IsISO8601, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProcedureDraftDto {
  @IsOptional()
  @IsObject()
  contentJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId?: string;

  /** Optimistic lock : `updatedAt` ISO de la procédure. */
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
