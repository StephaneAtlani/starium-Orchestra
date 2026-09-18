import { IsEnum, IsISO8601, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProcedureCategory } from '@prisma/client';

export class UpdateProcedureDraftDto {
  @IsOptional()
  @IsObject()
  contentJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsEnum(ProcedureCategory)
  category?: ProcedureCategory;

  /** Optimistic lock : `updatedAt` ISO de la procédure. */
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
