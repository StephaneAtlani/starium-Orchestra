import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from './pagination.query.dto';

export class PreviewManagerScopeQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
