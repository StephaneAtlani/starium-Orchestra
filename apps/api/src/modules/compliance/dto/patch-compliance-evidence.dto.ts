import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ComplianceEvidenceAssessment } from '@prisma/client';

export class PatchComplianceEvidenceDto {
  @IsOptional()
  @IsEnum(ComplianceEvidenceAssessment)
  assessment?: ComplianceEvidenceAssessment;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsDateString()
  collectedAt?: string | null;
}

export class CreateComplianceEvidenceVersionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fileId?: string | null;

  @IsOptional()
  @IsDateString()
  collectedAt?: string | null;
}
