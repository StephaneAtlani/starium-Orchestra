import { IsOptional, IsString, MinLength } from 'class-validator';

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
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  fileId?: string;
}
