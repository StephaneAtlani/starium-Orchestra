import { BudgetEnvelopeStatus, BudgetLineStatus } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
} from 'class-validator';

const MID_YEAR_LINE_STATUSES = [
  BudgetLineStatus.PENDING_VALIDATION,
  BudgetLineStatus.DRAFT,
] as const;

const MID_YEAR_ENVELOPE_STATUSES = [
  BudgetEnvelopeStatus.PENDING_VALIDATION,
  BudgetEnvelopeStatus.DRAFT,
] as const;

export class UpdateClientBudgetWorkflowSettingsDto {
  @IsOptional()
  @IsBoolean()
  requireEnvelopesNonDraftForBudgetValidated?: boolean;

  /** Statuts de ligne inclus dans les versions figées (whitelist). Au moins un si fourni. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(BudgetLineStatus, { each: true })
  snapshotIncludedBudgetLineStatuses?: BudgetLineStatus[];

  /** RFC-BUD-041 — activer le rituel Prévision d'atterrissage. */
  @IsOptional()
  @IsBoolean()
  landingForecastEnabled?: boolean;

  @IsOptional()
  @IsIn([...MID_YEAR_LINE_STATUSES])
  midYearDefaultLineStatus?:
    | typeof BudgetLineStatus.PENDING_VALIDATION
    | typeof BudgetLineStatus.DRAFT;

  @IsOptional()
  @IsIn([...MID_YEAR_ENVELOPE_STATUSES])
  midYearDefaultEnvelopeStatus?:
    | typeof BudgetEnvelopeStatus.PENDING_VALIDATION
    | typeof BudgetEnvelopeStatus.DRAFT;

  @IsOptional()
  @IsBoolean()
  midYearRequireJustification?: boolean;
}
