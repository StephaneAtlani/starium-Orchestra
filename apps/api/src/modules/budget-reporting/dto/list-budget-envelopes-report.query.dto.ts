import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetEnvelopeType } from '@prisma/client';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListBudgetEnvelopesReportQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(BudgetEnvelopeType)
  type?: BudgetEnvelopeType;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeChildren?: boolean;
}
