import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BudgetLineAllocationScope, BudgetLineStatus, ExpenseType } from '@prisma/client';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';

export class ListBudgetLinesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  budgetId?: string;

  @IsOptional()
  @IsString()
  envelopeId?: string;

  @IsOptional()
  @IsEnum(BudgetLineStatus)
  status?: BudgetLineStatus;

  @IsOptional()
  @IsEnum(ExpenseType)
  expenseType?: ExpenseType;

  @IsOptional()
  @IsString()
  costCenterId?: string;

  @IsOptional()
  @IsString()
  generalLedgerAccountId?: string;

  @IsOptional()
  @IsEnum(BudgetLineAllocationScope)
  allocationScope?: BudgetLineAllocationScope;

  /** RFC-ORG-003 — filtre sur `BudgetLine.ownerOrgUnitId` (colonne stockée, pas l’effectif hérité du budget). */
  @IsOptional()
  @IsString()
  ownerOrgUnitId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
