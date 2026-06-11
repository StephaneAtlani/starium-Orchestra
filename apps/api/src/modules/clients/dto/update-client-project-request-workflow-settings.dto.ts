import {
  ProjectRequestRoutingTarget,
  ProjectRequestValidatorSelectionMode,
} from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateClientProjectRequestWorkflowSettingsDto {
  @IsOptional()
  @IsEnum(ProjectRequestRoutingTarget)
  defaultApprovedTarget?: ProjectRequestRoutingTarget;

  @IsOptional()
  @IsEnum(ProjectRequestValidatorSelectionMode)
  validatorSelectionMode?: ProjectRequestValidatorSelectionMode;

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
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  authorizedRoutingUserIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  authorizedRoutingRoleIds?: string[];

  @IsOptional()
  @IsBoolean()
  allowRequesterToSelectValidator?: boolean;

  @IsOptional()
  @IsBoolean()
  allowValidatorToChooseRoutingTarget?: boolean;

  @IsOptional()
  @IsString()
  defaultGovernanceCycleId?: string | null;
}
