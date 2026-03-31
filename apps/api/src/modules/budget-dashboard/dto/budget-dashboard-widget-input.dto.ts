import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { BudgetDashboardWidgetType } from '@prisma/client';

export class BudgetDashboardWidgetInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsEnum(BudgetDashboardWidgetType)
  type!: BudgetDashboardWidgetType;

  @IsInt()
  @Min(0)
  position!: number;

  @IsString()
  title!: string;

  @IsString()
  size!: string;

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class BudgetDashboardWidgetsArrayDto {
  @ValidateNested({ each: true })
  @Type(() => BudgetDashboardWidgetInputDto)
  widgets!: BudgetDashboardWidgetInputDto[];
}
