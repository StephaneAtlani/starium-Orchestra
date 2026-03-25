import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ProjectDocumentCategory } from '@prisma/client';

export class CreateProjectDocumentDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  originalFilename?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  extension?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn([
    ProjectDocumentCategory.GENERAL,
    ProjectDocumentCategory.CONTRACT,
    ProjectDocumentCategory.SPECIFICATION,
    ProjectDocumentCategory.DELIVERABLE,
    ProjectDocumentCategory.REPORT,
    ProjectDocumentCategory.FINANCIAL,
    ProjectDocumentCategory.COMPLIANCE,
    ProjectDocumentCategory.OTHER,
  ])
  category?: ProjectDocumentCategory;

  /** MVP: `MICROSOFT` non supporté en création */
  @IsIn(['STARIUM', 'EXTERNAL'])
  storageType!: 'STARIUM' | 'EXTERNAL';

  @ValidateIf((o) => o.storageType === 'STARIUM')
  @IsString()
  @MinLength(1)
  storageKey?: string;

  @ValidateIf((o) => o.storageType === 'EXTERNAL')
  @IsUrl({ require_tld: false })
  externalUrl?: string;
}

