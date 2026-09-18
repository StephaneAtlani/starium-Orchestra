import { IsISO8601, IsObject, IsOptional } from 'class-validator';

export class UpdateProcedureDraftDto {
  @IsObject()
  contentJson!: Record<string, unknown>;

  /** Optimistic lock : `updatedAt` ISO de la procédure. */
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
