import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

function toBoolean(value: unknown): boolean {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return true; // default when omitted
}

function toBooleanOrUndefined(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  // si la valeur est fournie mais non reconnue, on considère true (comportement cohérent avec `toBoolean`)
  return true;
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

  /**
   * Quand true => agrège les données sur tous les budgets (multi-budget) du même exercice.
   * MVP : agrégation KPI / calculs financiers uniquement (pas de drilldown fiable par budget).
   */
  @IsOptional()
  @Transform(({ value }) => toBooleanOrUndefined(value))
  @IsBoolean()
  aggregateBudgetsForExercise?: boolean;
}
