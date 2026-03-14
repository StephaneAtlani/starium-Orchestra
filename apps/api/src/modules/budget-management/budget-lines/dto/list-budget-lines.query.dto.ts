import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BudgetLineStatus, ExpenseType } from '@prisma/client';
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
  search?: string;
}
