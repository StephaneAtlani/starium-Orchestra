import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BudgetDashboardWidgetInputDto } from './budget-dashboard-widget-input.dto';

export class CreateBudgetDashboardConfigDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  defaultExerciseId?: string;

  @IsOptional()
  @IsString()
  defaultBudgetId?: string;

  @IsOptional()
  @IsObject()
  layoutConfig?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  filtersConfig?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  thresholdsConfig?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BudgetDashboardWidgetInputDto)
  widgets?: BudgetDashboardWidgetInputDto[];
}
