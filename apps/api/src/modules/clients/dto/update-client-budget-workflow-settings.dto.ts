import { BudgetLineStatus } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
} from 'class-validator';

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
}
