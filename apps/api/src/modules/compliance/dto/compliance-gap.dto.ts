import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ComplianceGapCriticality,
  ComplianceGapStatus,
} from '@prisma/client';

export class CreateComplianceGapDto {
  @IsString()
  @MinLength(1)
  requirementId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  finding!: string;

  @IsOptional()
  @IsEnum(ComplianceGapCriticality)
  criticality?: ComplianceGapCriticality;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  businessImpact?: string;

  @IsOptional()
  @IsString()
  projectRiskId?: string;
}

export class PatchComplianceGapDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  finding?: string;

  @IsOptional()
  @IsEnum(ComplianceGapCriticality)
  criticality?: ComplianceGapCriticality;

  @IsOptional()
  @IsEnum(ComplianceGapStatus)
  status?: ComplianceGapStatus;

  @IsOptional()
  @IsString()
  ownerUserId?: string | null;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  businessImpact?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rootCause?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  verificationNote?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cancelReason?: string | null;

  @IsOptional()
  @IsString()
  projectRiskId?: string | null;
}
