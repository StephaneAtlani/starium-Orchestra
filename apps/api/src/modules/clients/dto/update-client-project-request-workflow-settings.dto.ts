import {
  ProjectRequestRoutingTarget,
  ProjectRequestType,
  ProjectRequestValidatorSelectionMode,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
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

  /** RFC-PROJ-INTAKE-002 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  copilThresholdAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  codirThresholdAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  instructionSlaBusinessDays?: number;

  @IsOptional()
  @IsBoolean()
  requireN1Validation?: boolean;

  @IsOptional()
  @IsBoolean()
  requirePmoInstruction?: boolean;

  @IsOptional()
  @IsBoolean()
  autoCreateProjectOnApproval?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(ProjectRequestType, { each: true })
  exemptRequestTypes?: ProjectRequestType[];
}
