import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ActionPlanPriority, ActionPlanStatus } from '@prisma/client';

export class CreateActionPlanDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  code!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(ActionPlanStatus)
  status!: ActionPlanStatus;

  @IsEnum(ActionPlanPriority)
  priority!: ActionPlanPriority;

  @IsOptional()
  @IsString()
  ownerUserId?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  targetDate?: string | null;
}
