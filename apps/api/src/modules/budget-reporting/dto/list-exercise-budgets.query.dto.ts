import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BudgetStatus } from '@prisma/client';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListExerciseBudgetsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;
}
