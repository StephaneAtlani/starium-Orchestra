import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ComplianceContributionStatus } from '@prisma/client';

export class CreateComplianceContributionDto {
  @IsString()
  @MinLength(1)
  requirementId!: string;

  @IsString()
  @MinLength(1)
  assigneeUserId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  instruction!: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class PatchComplianceContributionDto {
  @IsOptional()
  @IsEnum(ComplianceContributionStatus)
  status?: ComplianceContributionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  response?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  instruction?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  assigneeUserId?: string;
}
