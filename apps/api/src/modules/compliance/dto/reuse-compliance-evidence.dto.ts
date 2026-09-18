import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchComplianceEvidenceQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  excludeRequirementId?: string;
}

export class ReuseComplianceEvidenceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sourceEvidenceId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  requirementId!: string;
}
