import {
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum ComplianceEvidenceKindDto {
  URL = 'URL',
  OBSERVATION = 'OBSERVATION',
  FILE = 'FILE',
}

export class CreateComplianceEvidenceDto {
  @IsString()
  @MinLength(1)
  requirementId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ComplianceEvidenceKindDto)
  kind?: ComplianceEvidenceKindDto;

  @ValidateIf(
    (o: CreateComplianceEvidenceDto) =>
      o.kind === ComplianceEvidenceKindDto.URL ||
      (o.kind == null && Boolean(o.url?.trim())),
  )
  @IsOptional()
  @IsString()
  url?: string;

  @ValidateIf(
    (o: CreateComplianceEvidenceDto) =>
      o.kind === ComplianceEvidenceKindDto.FILE ||
      (o.kind == null && Boolean(o.fileId?.trim())),
  )
  @IsOptional()
  @IsString()
  fileId?: string;
}
