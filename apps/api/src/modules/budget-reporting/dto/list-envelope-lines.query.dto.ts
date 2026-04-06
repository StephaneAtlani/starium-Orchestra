import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListEnvelopeLinesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
