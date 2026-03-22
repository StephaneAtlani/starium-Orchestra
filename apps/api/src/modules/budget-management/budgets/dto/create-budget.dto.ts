import {
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumberString,
} from 'class-validator';
import { BudgetStatus, BudgetTaxMode } from '@prisma/client';

export class CreateBudgetDto {
  @IsString()
  @IsNotEmpty()
  exerciseId!: string;

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

  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  currency!: string;

  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsEnum(BudgetTaxMode)
  taxMode?: BudgetTaxMode;

  @IsOptional()
  @IsNumberString()
  defaultTaxRate?: string;
}
