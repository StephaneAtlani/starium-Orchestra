import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';

export class ListBudgetEnvelopesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  budgetId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
