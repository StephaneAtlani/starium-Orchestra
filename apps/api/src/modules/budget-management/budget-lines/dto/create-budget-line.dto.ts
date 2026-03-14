import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  Min,
} from 'class-validator';
import { ExpenseType } from '@prisma/client';
import { BudgetLineStatus } from '@prisma/client';

export class CreateBudgetLineDto {
  @IsString()
  @IsNotEmpty()
  budgetId!: string;

  @IsString()
  @IsNotEmpty()
  envelopeId!: string;

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

  @IsEnum(ExpenseType)
  expenseType!: ExpenseType;

  @IsNumber()
  @Min(0)
  initialAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revisedAmount?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  currency!: string;

  @IsOptional()
  @IsEnum(BudgetLineStatus)
  status?: BudgetLineStatus;
}
