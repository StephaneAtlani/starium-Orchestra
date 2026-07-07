import { ArrayUnique, IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateClientStrategicDirectionStrategyWorkflowSettingsDto {
  @IsOptional()
  @IsBoolean()
  allowSubmitterToSelectValidator?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  authorizedValidatorUserIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  authorizedValidatorRoleIds?: string[];

  @IsOptional()
  @IsString()
  defaultValidatorUserId?: string | null;
}
