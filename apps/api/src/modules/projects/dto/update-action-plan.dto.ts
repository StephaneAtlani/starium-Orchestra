import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ActionPlanPriority, ActionPlanStatus } from '@prisma/client';

export class UpdateActionPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(ActionPlanStatus)
  status?: ActionPlanStatus;

  @IsOptional()
  @IsEnum(ActionPlanPriority)
  priority?: ActionPlanPriority;

  @IsOptional()
  @IsString()
  ownerUserId?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  targetDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  /** RFC-CAPA-001 — null = défaut ; `true` interdit si tâches liées projet/risque. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsBoolean()
  consumesCapacity?: boolean | null;
}
