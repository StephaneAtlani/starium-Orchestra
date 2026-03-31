import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ComplianceAssessmentStatus } from '@prisma/client';

export class PatchComplianceStatusDto {
  @IsEnum(ComplianceAssessmentStatus)
  status!: ComplianceAssessmentStatus;

  @IsOptional()
  @IsDateString()
  lastAssessmentDate?: string;

  @IsOptional()
  @IsString()
  comment?: string | null;
}
