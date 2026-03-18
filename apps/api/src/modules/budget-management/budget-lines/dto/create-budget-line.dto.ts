import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetLineAllocationScope, ExpenseType } from '@prisma/client';
import { BudgetLineStatus } from '@prisma/client';
import { CostCenterSplitItemDto } from './cost-center-split-item.dto';

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

  @IsOptional()
  @IsString()
  generalLedgerAccountId?: string | null;

  @IsOptional()
  @IsString()
  analyticalLedgerAccountId?: string | null;

  @IsOptional()
  @IsEnum(BudgetLineAllocationScope)
  allocationScope?: BudgetLineAllocationScope;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CostCenterSplitItemDto)
  costCenterSplits?: CostCenterSplitItemDto[];

  @IsNumber()
  @Min(0)
  initialAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revisedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  currency!: string;

  @IsOptional()
  @IsEnum(BudgetLineStatus)
  status?: BudgetLineStatus;
}
