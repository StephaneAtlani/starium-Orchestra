import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { BudgetDashboardWidgetInputDto } from './budget-dashboard-widget-input.dto';

export class UpdateBudgetDashboardConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  defaultExerciseId?: string | null;

  @IsOptional()
  @IsString()
  defaultBudgetId?: string | null;

  @IsOptional()
  @IsObject()
  layoutConfig?: Record<string, unknown>;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsObject()
  filtersConfig?: Record<string, unknown> | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsObject()
  thresholdsConfig?: Record<string, unknown> | null;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BudgetDashboardWidgetInputDto)
  widgets?: BudgetDashboardWidgetInputDto[];
}
