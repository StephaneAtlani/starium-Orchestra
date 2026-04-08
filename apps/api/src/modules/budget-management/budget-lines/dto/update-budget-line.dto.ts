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
import { BudgetLineAllocationScope, BudgetLineStatus, ExpenseType } from '@prisma/client';
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

  /** Obligatoire si statut DEFERRED (sinon valeur existante si déjà DEFERRED). Interdit si statut ≠ DEFERRED. */
  @IsOptional()
  @IsString()
  deferredToExerciseId?: string | null;

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
  @IsEnum(ExpenseType)
  expenseType?: ExpenseType;

  /** Commentaire optionnel lors d’un changement de statut — stocké dans l’audit `budget_line.status.changed` (non persisté sur la ligne). */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  statusChangeComment?: string;
}
