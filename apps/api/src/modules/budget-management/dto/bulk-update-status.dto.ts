import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  BudgetEnvelopeStatus,
  BudgetExerciseStatus,
  BudgetLineStatus,
  BudgetStatus,
} from '@prisma/client';

/** Limite pour éviter les requêtes trop lourdes (audit + validations par id). */
export const BULK_STATUS_MAX_IDS = 100;

export class BulkUpdateBudgetExerciseStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_STATUS_MAX_IDS)
  @IsString({ each: true })
  ids!: string[];

  @IsEnum(BudgetExerciseStatus)
  status!: BudgetExerciseStatus;
}

export class BulkUpdateBudgetStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_STATUS_MAX_IDS)
  @IsString({ each: true })
  ids!: string[];

  @IsEnum(BudgetStatus)
  status!: BudgetStatus;
}

export class BulkUpdateBudgetEnvelopeStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_STATUS_MAX_IDS)
  @IsString({ each: true })
  ids!: string[];

  @IsEnum(BudgetEnvelopeStatus)
  status!: BudgetEnvelopeStatus;

  /** Obligatoire si `status === DEFERRED`, interdit sinon (validé aussi côté service). */
  @IsOptional()
  @IsString()
  deferredToExerciseId?: string | null;
}

export class BulkUpdateBudgetLineStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_STATUS_MAX_IDS)
  @IsString({ each: true })
  ids!: string[];

  @IsEnum(BudgetLineStatus)
  status!: BudgetLineStatus;

  /** Obligatoire si `status === DEFERRED`, interdit sinon (validé aussi côté service). */
  @IsOptional()
  @IsString()
  deferredToExerciseId?: string | null;
}

/** Réponse commune aux endpoints PATCH …/bulk-status. */
export type BulkStatusApplyResult = {
  status: string;
  updatedIds: string[];
  failed: { id: string; error: string }[];
};
