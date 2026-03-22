import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetEnvelopeType, BudgetStatus } from '@prisma/client';

export class CreateBudgetEnvelopeDto {
  @IsString()
  @IsNotEmpty()
  budgetId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(BudgetEnvelopeType)
  type!: BudgetEnvelopeType;

  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
