import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateClientBudgetWorkflowSettingsDto {
  @IsOptional()
  @IsBoolean()
  requireEnvelopesNonDraftForBudgetValidated?: boolean;
}
