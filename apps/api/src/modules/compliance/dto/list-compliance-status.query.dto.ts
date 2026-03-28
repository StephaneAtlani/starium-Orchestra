import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ComplianceAssessmentStatus } from '@prisma/client';

export class ListComplianceStatusQueryDto {
  @IsOptional()
  @IsString()
  frameworkId?: string;

  @IsOptional()
  @IsEnum(ComplianceAssessmentStatus)
  status?: ComplianceAssessmentStatus;
}
