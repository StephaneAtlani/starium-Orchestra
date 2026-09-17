import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  maturityLevel?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  ownerUserId?: string | null;
}
