import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

function toBoolean(value: unknown): boolean {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return true; // default when omitted
}

export class DashboardQueryDto {
  @IsOptional()
  @IsString()
  exerciseId?: string;

  @IsOptional()
  @IsString()
  budgetId?: string;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includeEnvelopes?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includeLines?: boolean;

  /**
   * Quand false : n'applique pas les overrides utilisateur (mode "global").
   * Quand absent : comportement inchangé (mode "personnaliser").
   */
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  useUserOverrides?: boolean;
}
