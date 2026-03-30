import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class BudgetDashboardWidgetOverrideInputDto {
  @IsString()
  widgetId!: string;

  /**
   * Sparse semantics:
   * - `isActive` absent => no change for that field
   * - `isActive: null` => reset/unset override for that field
   */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsBoolean()
  isActive?: boolean | null;

  /**
   * Sparse semantics:
   * - `position` absent => no change for that field
   * - `position: null` => reset/unset override for that field
   */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(0)
  @Max(1000)
  position?: number | null;

  /**
   * MVP restriction:
   * `settings` are not user-overridable.
   * If sent with at least one key => 400.
   */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsObject()
  settings?: Record<string, unknown> | null;
}

export class PatchBudgetDashboardUserOverridesDto {
  @ValidateNested({ each: true })
  @Type(() => BudgetDashboardWidgetOverrideInputDto)
  overrides!: BudgetDashboardWidgetOverrideInputDto[];
}

