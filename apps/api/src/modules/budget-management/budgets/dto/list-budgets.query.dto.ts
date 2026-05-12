import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BudgetStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';

export class ListBudgetsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  exerciseId?: string;

  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  /** RFC-ORG-003 — filtre sur `Budget.ownerOrgUnitId` (colonne stockée). */
  @IsOptional()
  @IsString()
  ownerOrgUnitId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
