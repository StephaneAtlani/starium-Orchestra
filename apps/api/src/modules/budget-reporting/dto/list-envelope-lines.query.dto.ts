import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BudgetLineStatus } from '@prisma/client';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListEnvelopeLinesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(BudgetLineStatus)
  status?: BudgetLineStatus;
}
