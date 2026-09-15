import { Type } from 'class-transformer';
import { Allow, ArrayUnique, IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateClientStrategicDirectionStrategyWorkflowSettingsDto {
  @Allow()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allowSubmitterToSelectValidator?: boolean;

  /** `Allow` explicite : whitelist + forbidNonWhitelisted (Nest/class-validator). */
  @Allow()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allowSelfValidation?: boolean;

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

  @Allow()
  @IsOptional()
  @IsString()
  defaultValidatorUserId?: string | null;
}
