import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetLineAllocationScope, BudgetLineStatus } from '@prisma/client';
import { CostCenterSplitItemDto } from './cost-center-split-item.dto';

export class UpdateBudgetLineDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(BudgetLineStatus)
  status?: BudgetLineStatus;

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  revisedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsString()
  expenseType?: string;
}
